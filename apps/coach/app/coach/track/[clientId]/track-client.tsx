"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";
import { beatsBest, bestLabel, volumeLabel } from "@ptfive/coach-engine";
import { IconCheck, IconChevronRight, IconX } from "@/app/icons";
import { Spinner } from "@/app/spinner";
import {
  inGroup,
  muscleLabel,
  restLabel,
  MUSCLE_CHOICES,
} from "@/app/components";
import { WEEKDAY_SHORT } from "@/app/plan-week";
import { trackSessionAction, type TrackedSlotInput } from "../actions";
import { dateMedium } from "@/app/format";
import {
  DEFAULT_REST_SECONDS,
  clock,
  elapsedSeconds,
  remainingSeconds,
  restClock,
  restProgress,
  shiftRest,
  startRest,
  type Break,
  type Rest,
} from "@/app/athlete/log/rest";
import {
  keepScreenAwake,
  prepareSignal,
  signalRestOver,
} from "@/app/athlete/log/signal";

export interface TrackExercise {
  id: string;
  name: string;
  pattern: MovementPattern | null;
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  bodyweightFactor: number | null;
  block: TrainingBlock;
  cue: string | null;
  setup: string | null;
  isBodyweight: boolean;
}

export interface TrackPersonalBest {
  score: number;
  weightKg: number;
  reps: number;
  isBodyweight: boolean;
  on: string;
}

export interface TrackLastEffort {
  weightKg: number;
  reps: number;
  setCount: number;
  on: string;
}

export interface TrackPlanSlot {
  id: string;
  label: string;
  pattern: MovementPattern | null;
  muscleGroup: MuscleGroup | null;
  block: TrainingBlock;
  defaultExerciseId: string | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number | null;
  note: string | null;
}

export interface TrackPlanDay {
  id: string;
  title: string;
  isGuided: boolean;
  weekdays: number[];
  slots: TrackPlanSlot[];
}

interface DraftSet {
  weight: string;
  reps: string;
  rir: string;
}

interface DraftSlot {
  key: string;
  exercise: TrackExercise;
  plan: TrackPlanSlot | null;
  sets: DraftSet[];
}

const emptySet = (): DraftSet => ({ weight: "", reps: "", rir: "" });

/**
 * Die Satzmaske für den Trainer.
 *
 * Bewusst ein eigener Screen und keine Wiederverwendung der
 * Athletenmaske: Die hängt an der Anmeldung des Athleten und an seinem
 * Ziffernblock. Hier steht ein Trainer daneben, der zwischen zwei
 * Sätzen tippt — er hat beide Hände frei und will direkt ins Feld.
 *
 * Uhr und Pausenuhr sind dagegen dieselben. Sie kommen aus
 * `athlete/log/rest.ts` und `athlete/log/signal.ts`, weil eine zweite
 * Uhr, die anders rechnet, irgendwann anders rechnet — und dann steht
 * in der Historie eine Dauer, die es nie gab. Nur das Aussehen ist
 * eigenes CSS, weil Coach- und Athletenbereich verschiedene Paletten
 * haben.
 *
 * Was beide sonst teilen, teilen sie über die Engine: wirksame Last,
 * Volumen, Bestleistung. Die Zahlen dürfen nicht auseinanderlaufen.
 */
export function TrackWorkout({
  clientId,
  clientName,
  planId,
  planName,
  days,
  lastPlanDayId,
  exercises,
  bests,
  lastEfforts,
  bodyWeightKg,
}: {
  clientId: string;
  clientName: string;
  planId: string | null;
  planName: string | null;
  days: TrackPlanDay[];
  lastPlanDayId: string | null;
  exercises: TrackExercise[];
  bests: Record<string, TrackPersonalBest>;
  lastEfforts: Record<string, TrackLastEffort>;
  bodyWeightKg: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [day, setDay] = useState<TrackPlanDay | null>(null);
  const [started, setStarted] = useState(false);
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [picking, setPicking] = useState(false);
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // ---------- Uhren ----------
  //
  // Ein gemeinsamer Herzschlag für Trainings- und Pausenuhr. Beide lesen
  // `now` und rechnen aus Zeitstempeln — gezählt wird nichts. Sonst
  // bliebe die Uhr stehen, sobald das Handy in der Tasche liegt, also
  // genau während der Pause, die sie messen soll.
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [rest, setRest] = useState<Rest | null>(null);

  // Welche Sätze schon eine Pause ausgelöst haben. Ohne das startet jede
  // Korrektur an einer Zahl die Pause neu.
  const gestartet = useRef<Set<string>>(new Set());

  const paused = breaks.length > 0 && breaks[breaks.length - 1]!.bis === null;
  const elapsed =
    startedAt === null ? 0 : elapsedSeconds(startedAt, breaks, now);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [started]);

  // Zurück aus dem Hintergrund: sofort neu rechnen, nicht bis zum
  // nächsten Tick eine veraltete Zeit zeigen.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") setNow(Date.now());
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!started) return;
    return keepScreenAwake();
  }, [started]);

  const restLeft = rest ? remainingSeconds(rest, now) : 0;

  // Signal genau einmal, wenn die Pause durch ist.
  useEffect(() => {
    if (!rest || rest.signalled) return;
    if (remainingSeconds(rest, now) > 0) return;
    signalRestOver();
    setRest((r) => (r ? { ...r, signalled: true } : r));
  }, [rest, now]);

  // Die abgelaufene Leiste räumt sich selbst weg — sie hat ihre Aufgabe
  // erfüllt und verdeckt sonst die untersten Felder.
  useEffect(() => {
    if (!rest || !rest.signalled) return;
    const id = setTimeout(() => setRest(null), 8000);
    return () => clearTimeout(id);
  }, [rest]);

  function togglePause() {
    const t = Date.now();
    setNow(t);
    setBreaks((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.bis === null) {
        return [...prev.slice(0, -1), { ...last, bis: t }];
      }
      return [...prev, { von: t, bis: null }];
    });
  }

  function beginRest(slotKey: string, seconds: number) {
    const t = Date.now();
    setNow(t);
    setRest(startRest(slotKey, seconds, t));
  }

  /**
   * Der Trainer verlässt ein Wiederholungsfeld, in dem eine Zahl steht:
   * Der Satz gilt als gemacht, die Pause läuft los.
   *
   * An das Verlassen des Feldes geknüpft und nicht an jede Eingabe —
   * sonst startete die Pause beim ersten Tastendruck von „12" schon bei
   * der 1. Und nur einmal je Satz, damit eine spätere Korrektur die
   * Pause nicht zurücksetzt.
   */
  function commitSet(slot: DraftSlot, index: number) {
    const set = slot.sets[index];
    if (!set || !(Number(set.reps) > 0)) return;

    const id = `${slot.key}:${index}`;
    if (gestartet.current.has(id)) return;
    gestartet.current.add(id);

    // Nach dem letzten Satz der letzten Übung gibt es nichts mehr, wofür
    // man sich ausruht.
    const slotIndex = slots.findIndex((s) => s.key === slot.key);
    const letzter =
      index === slot.sets.length - 1 && slotIndex === slots.length - 1;
    if (letzter) return;

    beginRest(slot.key, slot.plan?.restSeconds ?? DEFAULT_REST_SECONDS);
  }

  /**
   * Gemeinsamer Start. `prepareSignal` gehört genau hierher: Der Ton am
   * Ende der Pause darf nur, wenn der Audio-Kanal einmal aus einer
   * Nutzergeste heraus geöffnet wurde. Dieser Tipp ist die letzte Geste
   * vor der ersten Pause.
   */
  function beginSession() {
    const t = Date.now();
    setStartedAt(t);
    setBreaks([]);
    setRest(null);
    setNow(t);
    gestartet.current = new Set();
    prepareSignal();
  }

  /** Vorschlag: der Tag nach dem zuletzt gemachten. */
  const suggested = useMemo(() => {
    if (days.length === 0) return null;
    const i = days.findIndex((d) => d.id === lastPlanDayId);
    return days[(i + 1) % days.length] ?? days[0]!;
  }, [days, lastPlanDayId]);

  function bodyLoad(ex: TrackExercise): number | null {
    if (ex.bodyweightFactor === null || bodyWeightKg === null) return null;
    return Math.round(bodyWeightKg * ex.bodyweightFactor * 10) / 10;
  }

  function startDay(chosen: TrackPlanDay) {
    const drafts: DraftSlot[] = [];
    for (const slot of chosen.slots) {
      const exercise = slot.defaultExerciseId
        ? exercises.find((e) => e.id === slot.defaultExerciseId)
        : undefined;
      if (!exercise) continue;
      drafts.push({
        key: `${slot.id}-${drafts.length}`,
        exercise,
        plan: slot,
        sets: Array.from({ length: slot.targetSets }, emptySet),
      });
    }
    setDay(chosen);
    setSlots(drafts);
    setStarted(true);
    beginSession();
  }

  function startFree() {
    setDay(null);
    setSlots([]);
    setStarted(true);
    setPicking(true);
    beginSession();
  }

  function addExercise(ex: TrackExercise) {
    setSlots((prev) => [
      ...prev,
      {
        key: `${ex.id}-${prev.length}-${Date.now()}`,
        exercise: ex,
        plan: null,
        sets: [emptySet(), emptySet(), emptySet()],
      },
    ]);
    setPicking(false);
    setGroup(null);
  }

  function updateCell(
    key: string,
    i: number,
    field: keyof DraftSet,
    v: string,
  ) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              sets: s.sets.map((set, j) =>
                j === i ? { ...set, [field]: v } : set,
              ),
            }
          : s,
      ),
    );
  }

  function addSet(key: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              sets: [
                ...s.sets,
                { ...(s.sets[s.sets.length - 1] ?? emptySet()) },
              ],
            }
          : s,
      ),
    );
  }

  function removeSet(key: string, i: number) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key && s.sets.length > 1
          ? { ...s, sets: s.sets.filter((_, j) => j !== i) }
          : s,
      ),
    );
  }

  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  /** Letzte Last übernehmen — derselbe Griff wie beim Athleten. */
  function applyLast(key: string, last: TrackLastEffort) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              sets: s.sets.map((set) => ({
                ...set,
                weight: last.weightKg === 0 ? "" : String(last.weightKg),
                reps: set.reps === "" ? String(last.reps) : set.reps,
              })),
            }
          : s,
      ),
    );
  }

  const filledSets = slots.reduce(
    (n, s) => n + s.sets.filter((set) => Number(set.reps) > 0).length,
    0,
  );

  const volume = slots.reduce((n, s) => {
    const body = bodyLoad(s.exercise) ?? 0;
    return (
      n +
      s.sets.reduce((m, set) => {
        const zusatz = Math.max(0, Number(set.weight.replace(",", ".")) || 0);
        const reps = Number(set.reps) || 0;
        const last = body + zusatz;
        return m + (last > 0 ? last * reps : 0);
      }, 0)
    );
  }, 0);

  function save() {
    setError(null);
    const payload: TrackedSlotInput[] = slots
      .map((s) => ({
        pattern: s.plan?.pattern ?? s.exercise.pattern,
        muscleGroup: s.plan?.muscleGroup ?? s.exercise.muscleGroup,
        block: s.plan?.block ?? s.exercise.block,
        exerciseId: s.exercise.id,
        planSlotId: s.plan?.id ?? null,
        sets: s.sets
          .filter((set) => Number(set.reps) > 0)
          .map((set) => ({
            weightKg: Number(set.weight.replace(",", ".")) || 0,
            bodyLoadKg: bodyLoad(s.exercise),
            reps: Number(set.reps),
            isBodyweight: s.exercise.isBodyweight && !Number(set.weight),
            rir: set.rir === "" ? null : Number(set.rir),
          })),
      }))
      .filter((s) => s.sets.length > 0);

    if (payload.length === 0) {
      setError("Trag mindestens einen Satz mit Wiederholungen ein.");
      return;
    }

    startTransition(async () => {
      const res = await trackSessionAction(
        clientId,
        payload,
        day?.title ?? "Training",
        {
          planId: day ? planId : null,
          planDayId: day?.id ?? null,
          // Reine Trainingszeit, ohne die Zeiträume, in denen der Trainer
          // die Uhr angehalten hat. Bisher stand hier nichts — eine vom
          // Trainer erfasste Einheit hatte deshalb nie eine Dauer.
          durationSeconds: elapsed,
        },
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  // ---------- Fertig ----------
  if (done) {
    return (
      <main className="pt-shell" style={{ paddingTop: 40, maxWidth: 520 }}>
        <div className="pt-card" style={{ textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              display: "grid",
              placeItems: "center",
              width: 58,
              height: 58,
              margin: "0 auto 14px",
              borderRadius: "50%",
              background: "#eef6e8",
              color: "#2f6b12",
            }}
          >
            <IconCheck size={30} strokeWidth={2.6} />
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
            Gespeichert
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-md)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.55,
            }}
          >
            {filledSets} {filledSets === 1 ? "Satz" : "Sätze"} für {clientName},{" "}
            {volumeLabel(volume)}
            {elapsed > 0 && `, ${clock(elapsed)} Trainingszeit`}. Die Einheit
            ist als von dir erfasst gespeichert.
          </p>
          <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
            <Link
              href={`/coach/clients/${clientId}`}
              className="pt-btn"
              style={{ textAlign: "center" }}
            >
              Zur Klientenakte
            </Link>
            <Link
              href="/coach/track"
              className="pt-btn pt-btn--ghost"
              style={{ textAlign: "center" }}
            >
              Nächster Klient
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Tag wählen ----------
  if (!started) {
    return (
      <>
        <TrackBar clientName={clientName} clientId={clientId} />
        <main className="pt-shell" style={{ paddingTop: 18, maxWidth: 560 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
            Was macht ihr heute?
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
            }}
          >
            {planName ? planName : "Kein aktiver Plan"}
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {days.map((d) => (
              <button
                key={d.id}
                type="button"
                className="pt-pickrow"
                onClick={() => startDay(d)}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>
                    {d.title}
                    {suggested?.id === d.id && (
                      <span className="pt-chip" style={{ marginLeft: 8 }}>
                        dran
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--pt-text-dim)",
                      marginTop: 2,
                    }}
                  >
                    {d.slots.length} Übungen
                    {d.weekdays.length > 0 &&
                      ` · ${d.weekdays.map((w) => WEEKDAY_SHORT[w - 1]).join(" + ")}`}
                    {d.isGuided && " · mit Trainer"}
                  </span>
                </span>
                <IconChevronRight size={17} />
              </button>
            ))}

            <button
              type="button"
              className="pt-pickrow"
              onClick={startFree}
              style={{ marginTop: days.length > 0 ? 6 : 0 }}
            >
              <span>
                <span style={{ display: "block", fontWeight: 600 }}>
                  Freies Training
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                    marginTop: 2,
                  }}
                >
                  Übungen einzeln zusammenstellen
                </span>
              </span>
              <IconChevronRight size={17} />
            </button>
          </div>
        </main>
      </>
    );
  }

  // ---------- Übung wählen ----------
  if (picking) {
    const list =
      group === null ? [] : exercises.filter((e) => inGroup(e, group));

    return (
      <>
        <TrackBar clientName={clientName} clientId={clientId} />
        <main className="pt-shell" style={{ paddingTop: 18, maxWidth: 560 }}>
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            onClick={() => (group ? setGroup(null) : setPicking(false))}
            style={{ marginBottom: 14, width: "auto", padding: "0 14px" }}
          >
            ← Zurück
          </button>

          <h1 style={{ margin: "0 0 14px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
            {group ? muscleLabel(group) : "Welche Muskelgruppe?"}
          </h1>

          <div style={{ display: "grid", gap: 8 }}>
            {group === null
              ? MUSCLE_CHOICES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="pt-pickrow"
                    onClick={() => setGroup(g)}
                  >
                    <span style={{ fontWeight: 600 }}>{muscleLabel(g)}</span>
                    <IconChevronRight size={17} />
                  </button>
                ))
              : list.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="pt-pickrow"
                    onClick={() => addExercise(e)}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600 }}>
                        {e.name}
                      </span>
                      {bests[e.id] && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "var(--pt-fs-sm)",
                            color: "var(--pt-text-dim)",
                            marginTop: 2,
                          }}
                        >
                          Best:{" "}
                          {bests[e.id]!.isBodyweight
                            ? `${bests[e.id]!.reps} Wdh.`
                            : `${bests[e.id]!.weightKg} kg × ${bests[e.id]!.reps}`}
                        </span>
                      )}
                    </span>
                    <IconChevronRight size={17} />
                  </button>
                ))}
          </div>
        </main>
      </>
    );
  }

  // ---------- Sätze eintragen ----------
  return (
    <>
      <TrackBar clientName={clientName} clientId={clientId} />
      <main className="pt-shell" style={{ paddingTop: 16, maxWidth: 620 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: "0 0 2px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
              {day ? day.title : "Freies Training"}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
              }}
            >
              {filledSets} {filledSets === 1 ? "Satz" : "Sätze"} ·{" "}
              {volumeLabel(volume)}
            </p>
          </div>

          {/* Die Uhr läuft ab dem Tippen auf den Trainingstag. Sie wird
              als Dauer mitgespeichert — ohne sie stand in der Historie
              jeder vom Trainer erfassten Einheit „keine Angabe". */}
          <div className="pt-trackclock">
            <span
              className="pt-trackclock__time"
              data-paused={paused}
              role="timer"
              aria-live="off"
              aria-label="Trainingsdauer"
            >
              {clock(elapsed)}
            </span>
            <button
              type="button"
              className="pt-timerbtn"
              onClick={togglePause}
              aria-label={paused ? "Uhr fortsetzen" : "Uhr anhalten"}
              title={paused ? "Fortsetzen" : "Anhalten"}
            >
              {paused ? "▶" : "❚❚"}
            </button>
          </div>
        </div>

        {slots.map((slot) => {
          const last = lastEfforts[slot.exercise.id];
          const pb = bests[slot.exercise.id];
          const body = bodyLoad(slot.exercise);

          return (
            <div
              key={slot.key}
              className="pt-card"
              style={{ marginBottom: 10 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
                    {slot.exercise.name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--pt-text-dim)",
                      lineHeight: 1.45,
                    }}
                  >
                    {muscleLabel(
                      slot.plan?.muscleGroup ?? slot.exercise.muscleGroup,
                    )}
                    {slot.plan &&
                      ` · ${slot.plan.targetSets} × ${slot.plan.targetRepsMin}${
                        slot.plan.targetRepsMin !== slot.plan.targetRepsMax
                          ? `–${slot.plan.targetRepsMax}`
                          : ""
                      }`}
                    {slot.plan?.restSeconds != null &&
                      ` · Pause ${restLabel(slot.plan.restSeconds)}`}
                    {pb &&
                      ` · Best ${
                        pb.isBodyweight
                          ? `${pb.reps} Wdh.`
                          : `${pb.weightKg} kg × ${pb.reps}`
                      }`}
                  </p>
                  {body !== null && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "var(--pt-fs-sm)",
                        color: "var(--pt-text-dim)",
                      }}
                    >
                      Zählt mit {body} kg Körpergewicht — ins kg-Feld nur den
                      Zusatz.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="pt-iconbtn"
                  aria-label={`${slot.exercise.name} entfernen`}
                  onClick={() => removeSlot(slot.key)}
                  style={{ flex: "none" }}
                >
                  <IconX size={15} />
                </button>
              </div>

              {last && (
                <button
                  type="button"
                  className="pt-chipbtn"
                  onClick={() => applyLast(slot.key, last)}
                  style={{ marginTop: 10 }}
                >
                  Letztes Mal:{" "}
                  {last.weightKg === 0 ? "KG" : `${last.weightKg} kg`} ×{" "}
                  {last.reps} ({dateMedium(new Date(last.on))}) — übernehmen
                </button>
              )}

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div className="pt-trackhead">
                  <span />
                  <span>{body !== null ? "+ kg" : "kg"}</span>
                  <span>Wdh.</span>
                  <span>RIR</span>
                  <span />
                </div>
                {slot.sets.map((set, i) => {
                  /* Derselbe Moment wie beim Athleten, gerechnet auf
                     dem, was gerade im Feld steht. Der Trainer soll
                     „105, stark" sagen können, während der Klient noch
                     an der Bank steht — nicht erst zu Hause. */
                  const rekord = beatsBest(
                    {
                      weightKg: Number(set.weight.replace(",", ".")) || 0,
                      bodyLoadKg: bodyLoad(slot.exercise),
                      reps: Number(set.reps) || 0,
                      isBodyweight:
                        slot.exercise.isBodyweight && !Number(set.weight),
                    },
                    bests[slot.exercise.id] ?? null,
                  );

                  return (
                  <div key={i} className="pt-trackrow" data-best={Boolean(rekord)}>
                    <span className="pt-trackrow__n">{i + 1}</span>
                    <input
                      inputMode="decimal"
                      value={set.weight}
                      onChange={(e) =>
                        updateCell(slot.key, i, "weight", e.target.value)
                      }
                      aria-label={`Satz ${i + 1} Gewicht`}
                    />
                    <input
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(e) =>
                        updateCell(slot.key, i, "reps", e.target.value)
                      }
                      onBlur={() => commitSet(slot, i)}
                      aria-label={`Satz ${i + 1} Wiederholungen`}
                    />
                    <input
                      inputMode="numeric"
                      value={set.rir}
                      onChange={(e) =>
                        updateCell(slot.key, i, "rir", e.target.value)
                      }
                      aria-label={`Satz ${i + 1} RIR`}
                    />
                    <button
                      type="button"
                      className="pt-iconbtn"
                      disabled={slot.sets.length <= 1}
                      aria-label={`Satz ${i + 1} löschen`}
                      onClick={() => removeSet(slot.key, i)}
                    >
                      <IconX size={14} />
                    </button>

                    {rekord && (
                      <span className="pt-best" aria-live="polite">
                        {bestLabel(rekord)}
                      </span>
                    )}
                  </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost"
                  onClick={() => addSet(slot.key)}
                  style={{ flex: 1, minHeight: 40, fontSize: "var(--pt-fs-base)" }}
                >
                  Satz hinzufügen
                </button>
                {/* Pause von Hand — für alles, was die Automatik nicht
                    trifft: ein Satz ohne Eintrag, ein Aufwärmsatz, oder
                    wenn der Klient länger braucht. */}
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost"
                  onClick={() =>
                    beginRest(
                      slot.key,
                      slot.plan?.restSeconds ?? DEFAULT_REST_SECONDS,
                    )
                  }
                  style={{ flex: "none", minHeight: 40, fontSize: "var(--pt-fs-base)" }}
                >
                  Pause
                </button>
              </div>
            </div>
          );
        })}

        {/*
          Abschluss. „Übung hinzufügen" und „Einheit speichern" standen
          mit 12px direkt untereinander — zwei Knöpfe über die volle
          Breite verschmelzen so zu einem Block, und im Studio trifft man
          mit dem Daumen den falschen. Jetzt trennt eine Linie den
          Abschluss von den Übungskarten, und die Knöpfe haben Abstand.
        */}
        <div className="pt-trackactions">
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            onClick={() => setPicking(true)}
          >
            Übung hinzufügen
          </button>

          {error && (
            <p
              style={{
                margin: 0,
                fontSize: "var(--pt-fs-md)",
                color: "var(--pt-action)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            className="pt-btn"
            onClick={save}
            disabled={pending}
          >
            {pending ? (
              <Spinner size={15} label="Speichert" />
            ) : (
              `Einheit für ${clientName} speichern`
            )}
          </button>
        </div>

        {/* Platz für die Pausenleiste. Ein Abstandhalter im Fluss statt
            eines Innenabstands am Behälter: Der trägt auf dem Handy
            bereits einen gerechneten Wert für die Tab-Leiste, und den
            von außen zu überschreiben würde ihn ersetzen statt ergänzen. */}
        {rest && <div aria-hidden style={{ height: 96 }} />}
      </main>

      {/* Pausenleiste. Sitzt fest am unteren Rand über der Tab-Leiste —
          zwischen zwei Sätzen ist das das Einzige, worauf der Trainer
          schaut, und er muss sie mit dem Daumen erreichen. */}
      {rest && (
        <div className="pt-restdock">
          <div
            className="pt-rest"
            data-over={restLeft === 0}
            role="timer"
            aria-live="off"
          >
            <div
              className="pt-rest__fill"
              style={{
                width: `${Math.round(restProgress(rest, now) * 100)}%`,
              }}
              aria-hidden
            />
            <div className="pt-rest__row">
              <div style={{ minWidth: 0 }}>
                <p className="pt-rest__label">
                  {restLeft === 0 ? "Pause vorbei" : "Pause"}
                </p>
                <p className="pt-rest__time">{restClock(restLeft)}</p>
              </div>

              <div className="pt-rest__actions">
                <button
                  type="button"
                  onClick={() =>
                    setRest((r) => (r ? shiftRest(r, -15, Date.now()) : r))
                  }
                  aria-label="Pause um 15 Sekunden kürzen"
                >
                  −15
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRest((r) => (r ? shiftRest(r, 15, Date.now()) : r))
                  }
                  aria-label="Pause um 15 Sekunden verlängern"
                >
                  +15
                </button>
                <button
                  type="button"
                  onClick={() => setRest(null)}
                  aria-label={
                    restLeft === 0 ? "Ausblenden" : "Pause überspringen"
                  }
                  data-primary
                >
                  {restLeft === 0 ? "Weiter" : "Skip"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Band über dem Screen: für wen wird hier eingetragen.
 *
 * Auffällig und immer sichtbar. Wer versehentlich beim falschen Klienten
 * tippt, merkt es sonst erst, wenn die Einheit gespeichert ist — und
 * dann steht sie in einer fremden Historie.
 */
function TrackBar({
  clientName,
  clientId,
}: {
  clientName: string;
  clientId: string;
}) {
  return (
    <div className="pt-trackbar">
      <span>
        Du trackst für <strong>{clientName}</strong>
      </span>
      <Link href={`/coach/clients/${clientId}`}>Abbrechen</Link>
    </div>
  );
}
