"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DEFAULT_REST_SECONDS,
  elapsedSeconds,
  remainingSeconds,
  restClock,
  restProgress,
  shiftRest,
  startRest,
  type Break,
  type Rest,
} from "./rest";
import { keepScreenAwake, prepareSignal, signalRestOver } from "./signal";
import type {
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";
import {
  MUSCLE_CHOICES,
  inGroup,
  muscleLabel,
  muscleSummary,
  restLabel,
  supersetCodes,
} from "@/app/components";
import { IconCheck, IconClock, IconX } from "@/app/icons";
import {
  beatsBest,
  bestLabel,
  volumeLabel,
  type VolumePoint,
} from "@ptfive/coach-engine";
import { saveSessionAction, type LoggedSlotInput } from "../actions";
import { WEEKDAY_SHORT, durationLabel, estimateMinutes } from "@/app/plan-week";
import { Numpad, type FieldKind } from "./numpad";
import { CountUp } from "@/app/count-up";
import { dayMonthNumeric } from "@/app/format";

export interface ExerciseOption {
  id: string;
  name: string;
  /** Läuft unter der Oberfläche mit und trägt die Kraftkurve. */
  pattern: MovementPattern | null;
  /** Was der Athlet sieht und wonach er sucht. */
  muscleGroup: MuscleGroup;
  /** Weitere Gruppen, unter denen die Übung auftaucht. */
  secondaryMuscleGroups: MuscleGroup[];
  /**
   * Anteil des Körpergewichts, den die Übung bewegt. null = läuft über
   * Wiederholungen, dann ist das kg-Feld die ganze Last.
   */
  bodyweightFactor: number | null;
  block: TrainingBlock;
  cue: string | null;
  /** Aufbau: Bankwinkel, Griffbreite, Standbreite. */
  setup: string | null;
  commonFault: string | null;
  isBodyweight: boolean;
}

export interface PersonalBest {
  score: number;
  weightKg: number;
  reps: number;
  isBodyweight: boolean;
  on: string;
}

/** Bester Satz der letzten Einheit — Vorlage für die Übernahme. */
export interface LastEffort {
  weightKg: number;
  reps: number;
  setCount: number;
  on: string;
}

export interface PlanSlotOption {
  id: string;
  label: string;
  pattern: MovementPattern | null;
  muscleGroup: MuscleGroup | null;
  block: TrainingBlock;
  defaultExerciseId: string | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  supersetGroup: string | null;
  tempo: string | null;
  restSeconds: number | null;
  note: string | null;
}

export interface PlanDayOption {
  id: string;
  title: string;
  isGuided: boolean;
  /** ISO-Wochentag 1–7, null = ohne festen Tag. */
  weekdays: number[];
  slots: PlanSlotOption[];
}

interface DraftSet {
  weight: string;
  reps: string;
  rir: string;
}

interface DraftSlot {
  key: string;
  exercise: ExerciseOption;
  sets: DraftSet[];
  /** Herkunft im Plan. Bleibt beim Übungstausch erhalten. */
  plan: PlanSlotOption | null;
}

/** Welches Feld der Ziffernblock gerade bearbeitet. */
interface Focus {
  slotKey: string;
  setIndex: number;
  field: FieldKind;
}

const FIELD_ORDER: FieldKind[] = ["weight", "reps", "rir"];

const emptySet = (): DraftSet => ({ weight: "", reps: "", rir: "" });

/** Sekunden als 12:34 — mitlaufende Uhr während der Einheit. */
function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LogWorkout({
  exercises,
  bests,
  lastEfforts,
  recentExerciseIds,
  planId,
  planName,
  planDays,
  lastPlanDayId,
  lastVolumes,
  bodyWeightKg,
  startDayId,
}: {
  exercises: ExerciseOption[];
  bests: Record<string, PersonalBest>;
  lastEfforts: Record<string, LastEffort>;
  recentExerciseIds: string[];
  planId: string | null;
  planName: string | null;
  planDays: PlanDayOption[];
  lastPlanDayId: string | null;
  /** Zuletzt bewegtes Volumen je Trainingstag, für den Vergleich am Ende. */
  lastVolumes: Record<string, VolumePoint>;
  /**
   * Körpergewicht aus dem jüngsten Check-in. null = nie gemeldet; dann
   * bleiben Körpergewichtsübungen auf der Wiederholungsskala.
   */
  bodyWeightKg: number | null;
  /** Aus ?day= — kommt der Athlet direkt aus dem Plan. */
  startDayId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [day, setDay] = useState<PlanDayOption | null>(null);
  const [started, setStarted] = useState(false);
  const [confirming, setConfirming] = useState<PlanDayOption | null>(
    // Kommt der Athlet mit ?day= aus dem Plan, geht es ohne Umweg über
    // die Tagesauswahl direkt in die Startbestätigung.
    () => planDays.find((d) => d.id === startDayId) ?? null,
  );
  const [ending, setEnding] = useState(false);

  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState<MuscleGroup | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);

  const [focus, setFocus] = useState<Focus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------- Uhren ----------
  //
  // Ein gemeinsamer Herzschlag für Trainings- und Pausenuhr. Beide lesen
  // `now` und rechnen selbst — gezählt wird nichts, sonst bliebe die Uhr
  // stehen, sobald das Handy in der Tasche liegt.
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [rest, setRest] = useState<Rest | null>(null);

  const paused = breaks.length > 0 && breaks[breaks.length - 1]!.bis === null;
  const elapsed =
    startedAt === null ? 0 : elapsedSeconds(startedAt, breaks, now);

  useEffect(() => {
    if (!started) return;
    // Viermal pro Sekunde: Der Sekundenwechsel wirkt dann prompt, ohne
    // dass es Arbeit kostet, die man messen könnte.
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

  /** Uhr anhalten oder weiterlaufen lassen. */
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

  // ---------- Pausenuhr ----------

  const restLeft = rest ? remainingSeconds(rest, now) : 0;

  // Signal genau einmal, wenn die Pause durch ist.
  useEffect(() => {
    if (!rest || rest.signalled) return;
    if (remainingSeconds(rest, now) > 0) return;
    signalRestOver();
    setRest((r) => (r ? { ...r, signalled: true } : r));
  }, [rest, now]);

  // Die abgelaufene Leiste räumt sich nach kurzer Zeit selbst weg — sie
  // hat ihre Aufgabe erfüllt und würde sonst den Daumen blockieren.
  useEffect(() => {
    if (!rest || !rest.signalled) return;
    const id = setTimeout(() => setRest(null), 8000);
    return () => clearTimeout(id);
  }, [rest]);

  function beginRest(slotKey: string, seconds: number) {
    const t = Date.now();
    setNow(t);
    setRest(startRest(slotKey, seconds, t));
  }

  // ---------- Bildschirm ----------

  useEffect(() => {
    if (!started) return;
    return keepScreenAwake();
  }, [started]);

  /**
   * Vorschlag: der Tag nach dem zuletzt gemachten. Nach Tag A kommt B,
   * nach dem letzten wieder der erste.
   */
  const suggestedDay = useMemo(() => {
    if (planDays.length === 0) return null;
    const i = planDays.findIndex((d) => d.id === lastPlanDayId);
    return planDays[(i + 1) % planDays.length] ?? planDays[0]!;
  }, [planDays, lastPlanDayId]);

  const recent = useMemo(
    () =>
      recentExerciseIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter((e): e is ExerciseOption => !!e),
    [recentExerciseIds, exercises],
  );

  /** Baut die Entwurfsslots aus einem Plantag. */
  /**
   * Was jeder Start gemeinsam hat.
   *
   * `prepareSignal` gehört genau hierher: Der Ton am Ende der Pause darf
   * nur, wenn der Audio-Kanal einmal aus einer Nutzergeste heraus
   * geöffnet wurde. Dieser Tipp ist die letzte Geste vor der ersten Pause.
   */
  function beginSession() {
    const t = Date.now();
    setStartedAt(t);
    setBreaks([]);
    setRest(null);
    setNow(t);
    prepareSignal();
  }

  function startDay(chosen: PlanDayOption) {
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
    setConfirming(null);
  }

  function startFree() {
    setDay(null);
    setStarted(true);
    beginSession();
    setPicking(true);
  }

  function addExercise(ex: ExerciseOption) {
    if (swapping) {
      // Beim Tausch bleibt der Plan-Slot bestehen: Das Muster ist die
      // Vorgabe, die Übung nur das Werkzeug darin.
      setSlots((prev) =>
        prev.map((s) => (s.key === swapping ? { ...s, exercise: ex } : s)),
      );
      setSwapping(null);
    } else {
      setSlots((prev) => [
        ...prev,
        {
          key: `${ex.id}-${Date.now()}`,
          exercise: ex,
          plan: null,
          sets: [emptySet()],
        },
      ]);
    }
    setPicking(false);
    setChoice(null);
  }

  function updateCell(f: Focus, value: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === f.slotKey
          ? {
              ...s,
              sets: s.sets.map((set, i) =>
                i === f.setIndex ? { ...set, [f.field]: value } : set,
              ),
            }
          : s,
      ),
    );
  }

  /** Springt zum nächsten Feld: Last → Wdh. → RIR → nächster Satz → nächste Übung. */
  function advance() {
    if (!focus) return;
    const slotIndex = slots.findIndex((s) => s.key === focus.slotKey);
    if (slotIndex < 0) return setFocus(null);
    const slot = slots[slotIndex]!;

    const fieldIndex = FIELD_ORDER.indexOf(focus.field);
    if (fieldIndex < FIELD_ORDER.length - 1) {
      return setFocus({ ...focus, field: FIELD_ORDER[fieldIndex + 1]! });
    }

    /**
     * Das letzte Feld ist ausgefüllt — der Satz ist durch, die Pause
     * beginnt jetzt und nicht erst, wenn jemand daran denkt.
     *
     * Nur bei einer Vorgabe aus dem Plan. Hat der Trainer nichts
     * eingetragen, hat er sich bewusst nicht festgelegt; dann startet
     * der Athlet die Pause über den Knopf an der Übung selbst.
     */
    const restSeconds = slot.plan?.restSeconds ?? null;
    const isLastSetOfLastSlot =
      focus.setIndex === slot.sets.length - 1 && slotIndex === slots.length - 1;
    if (restSeconds !== null && !isLastSetOfLastSlot) {
      beginRest(slot.key, restSeconds);
    }

    if (focus.setIndex < slot.sets.length - 1) {
      return setFocus({
        slotKey: slot.key,
        setIndex: focus.setIndex + 1,
        field: "weight",
      });
    }
    const nextSlot = slots[slotIndex + 1];
    if (nextSlot) {
      return setFocus({ slotKey: nextSlot.key, setIndex: 0, field: "weight" });
    }
    setFocus(null);
  }

  const isLastField = (() => {
    if (!focus) return false;
    const slotIndex = slots.findIndex((s) => s.key === focus.slotKey);
    const slot = slots[slotIndex];
    if (!slot) return true;
    return (
      focus.field === "rir" &&
      focus.setIndex === slot.sets.length - 1 &&
      slotIndex === slots.length - 1
    );
  })();

  function addSet(key: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              // Letzten Satz als Vorlage — meist bleibt das Gewicht gleich.
              sets: [
                ...s.sets,
                { ...(s.sets[s.sets.length - 1] ?? emptySet()) },
              ],
            }
          : s,
      ),
    );
  }

  /**
   * Einen Satz löschen.
   *
   * Der letzte Satz einer Übung bleibt stehen: Eine Übung ohne Sätze
   * wäre eine leere Zeile, die nichts bedeutet — dafür gibt es das
   * Entfernen der ganzen Übung.
   */
  function removeSet(key: string, index: number) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key && s.sets.length > 1
          ? { ...s, sets: s.sets.filter((_, i) => i !== index) }
          : s,
      ),
    );
    // Stand der Ziffernblock auf dem gelöschten Satz, schließt er sich —
    // sonst tippt der Athlet in eine Zeile, die es nicht mehr gibt.
    setFocus((f) => (f && f.slotKey === key && f.setIndex >= index ? null : f));
  }

  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
    if (focus?.slotKey === key) setFocus(null);
  }

  function applyLast(key: string, last: LastEffort) {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              sets: s.sets.map((set) => ({
                ...set,
                weight: last.weightKg === 0 ? "" : String(last.weightKg),
                reps: String(last.reps),
              })),
            }
          : s,
      ),
    );
  }

  /**
   * Bewegter Körperanteil dieser Übung in Kilogramm.
   *
   * null, wenn die Übung keinen Faktor hat (gehaltene Übungen) oder der
   * Athlet sein Gewicht nie gemeldet hat. Dann bleibt alles wie vorher.
   */
  function bodyLoad(ex: ExerciseOption): number | null {
    if (ex.bodyweightFactor === null || bodyWeightKg === null) return null;
    return Math.round(bodyWeightKg * ex.bodyweightFactor * 10) / 10;
  }

  // ---------- Zählwerte ----------
  const filledSets = slots.reduce(
    (n, s) => n + s.sets.filter((set) => Number(set.reps) > 0).length,
    0,
  );
  const plannedSets = slots.reduce((n, s) => n + (s.plan?.targetSets ?? 0), 0);
  const filledPlannedSets = slots.reduce(
    (n, s) =>
      n + (s.plan ? s.sets.filter((set) => Number(set.reps) > 0).length : 0),
    0,
  );
  const isComplete = plannedSets === 0 || filledPlannedSets >= plannedSets;

  /**
   * Volumen ohne Körpergewichtssätze — dieselbe Regel wie in der Engine.
   *
   * Ein Satz Klimmzüge hat keine Last. Ihn mit 0 kg einzurechnen hiesse,
   * einen Tag mit zwanzig Sätzen Klimmzügen als leeren Tag zu zeigen.
   */
  const loadedVolume = slots.reduce((n, s) => {
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

  /** Vergleich zum letzten Mal an genau diesem Trainingstag. */
  const vergleich = (() => {
    if (!day) return null;
    const letztes = lastVolumes[day.id];
    if (!letztes || letztes.volumeKg <= 0) return null;
    const delta = loadedVolume - letztes.volumeKg;
    const prozent = Math.round((delta / letztes.volumeKg) * 100);
    return { letztes, delta, prozent };
  })();

  const totalVolume = slots.reduce(
    (n, s) =>
      n +
      s.sets.reduce(
        (m, set) =>
          m +
          (Number(set.weight.replace(",", ".")) || 0) * (Number(set.reps) || 0),
        0,
      ),
    0,
  );

  /**
   * Welche Übungen heute eine neue Bestleistung gesehen haben.
   *
   * Je Übung nur EINMAL, mit dem besten Satz. Wer vier Sätze über der
   * alten Marke macht, hat eine Bestleistung verbessert und nicht vier
   * aufgestellt — eine Liste mit viermal „Bankdrücken" wäre eine
   * Buchhaltung und kein Erfolg.
   */
  const neueBestleistungen = useMemo(() => {
    const je = new Map<string, { name: string; text: string; wert: number }>();

    for (const slot of slots) {
      const marke = bests[slot.exercise.id] ?? null;
      for (const set of slot.sets) {
        const r = beatsBest(
          {
            weightKg: Number(set.weight.replace(",", ".")) || 0,
            bodyLoadKg: bodyLoad(slot.exercise),
            reps: Number(set.reps) || 0,
            isBodyweight: slot.exercise.isBodyweight && !Number(set.weight),
          },
          marke,
        );
        if (!r) continue;

        const bisher = je.get(slot.exercise.id);
        if (!bisher || r.deltaScore > bisher.wert) {
          je.set(slot.exercise.id, {
            name: slot.exercise.name,
            text: r.isFirst ? "Erstes Mal" : `+${r.percent} %`,
            wert: r.deltaScore,
          });
        }
      }
    }

    return [...je.values()].sort((a, b) => b.wert - a.wert);
  }, [slots, bests, bodyWeightKg]);

  function save() {
    setError(null);
    const payload: LoggedSlotInput[] = slots
      .map((s) => ({
        // Kommt der Slot aus dem Plan, gilt dessen Muster und Block —
        // auch wenn die Übung getauscht wurde. Genau so bleibt die
        // Musterhistorie über den Tausch hinweg zusammenhängend.
        pattern: s.plan?.pattern ?? s.exercise.pattern,
        // Wie beim Muster: Kommt der Slot aus dem Plan, gilt dessen
        // Vorgabe — auch wenn der Athlet die Übung getauscht hat.
        muscleGroup: s.plan?.muscleGroup ?? s.exercise.muscleGroup,
        block: s.plan?.block ?? s.exercise.block,
        exerciseId: s.exercise.id,
        planSlotId: s.plan?.id ?? null,
        sets: s.sets
          .filter((set) => Number(set.reps) > 0)
          .map((set) => ({
            weightKg: Number(set.weight.replace(",", ".")) || 0,
            // Festgehalten, nicht später gerechnet: Ändert sich das
            // Gewicht des Athleten oder der Faktor der Übung, soll das
            // die Historie nicht rückwirkend umschreiben.
            bodyLoadKg: bodyLoad(s.exercise),
            reps: Number(set.reps),
            isBodyweight: s.exercise.isBodyweight && !Number(set.weight),
            rir: set.rir === "" ? null : Number(set.rir),
          })),
      }))
      .filter((s) => s.sets.length > 0);

    if (payload.length === 0) {
      setError("Trag mindestens einen Satz mit Wiederholungen ein.");
      setEnding(false);
      return;
    }

    startTransition(async () => {
      const res = await saveSessionAction(payload, day?.title ?? "Training", {
        planId: day ? planId : null,
        planDayId: day?.id ?? null,
        durationSeconds: elapsed,
        isComplete,
      });
      if (res.ok) router.push("/athlete");
      else {
        setError(res.error);
        setEnding(false);
      }
    });
  }

  // ---------- Tagesauswahl ----------
  if (!started && planDays.length > 0) {
    return (
      <main className="gym-shell" style={{ paddingTop: 26 }}>
        <p className="gym-label">{planName}</p>
        <h1 style={{ margin: "3px 0 6px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
          Was steht an?
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
          Dein Coach hat die Tage vorbereitet. Übungen darin kannst du tauschen.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          {planDays.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setConfirming(d)}
              className="gym-card"
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>{d.title}</span>
                {d.id === suggestedDay?.id && (
                  <span
                    style={{
                      fontSize: "var(--pt-fs-xs)",
                      fontWeight: 700,
                      color: "var(--g-accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    DRAN
                  </span>
                )}
              </span>
              <span
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 6,
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--g-dim)",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {d.weekdays.length === 0
                    ? "flexibel"
                    : d.weekdays.map((w) => WEEKDAY_SHORT[w - 1]).join(" + ")}
                </span>
                <span>·</span>
                <span>{d.isGuided ? "Mit Trainer" : "Allein"}</span>
                <span>·</span>
                <span>{d.slots.length} Übungen</span>
                <span>·</span>
                <span>ca. {durationLabel(estimateMinutes(d.slots))}</span>
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 6,
                  fontSize: "var(--pt-fs-base)",
                  color: "var(--g-dim)",
                  lineHeight: 1.5,
                }}
              >
                {d.slots.map((s) => s.label).join(" · ")}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={startFree}
          className="gym-btn gym-btn--ghost"
          style={{ marginTop: 16 }}
        >
          Freies Training
        </button>

        {confirming && (
          <div
            className="gym-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Einheit starten"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirming(null);
            }}
          >
            <div className="gym-modal">
              <div className="gym-modal__mark" aria-hidden>
                <IconClock size={30} />
              </div>
              <h2
                style={{ margin: "18px 0 6px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}
              >
                {confirming.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--pt-fs-md)",
                  color: "var(--g-dim)",
                  lineHeight: 1.55,
                }}
              >
                {confirming.slots.length} Übungen, etwa{" "}
                {durationLabel(estimateMinutes(confirming.slots))}
                {confirming.isGuided ? ", mit deinem Trainer" : ""}. Die Uhr
                läuft ab jetzt mit.
              </p>
              <div style={{ display: "grid", gap: 8, marginTop: 22 }}>
                <button
                  type="button"
                  className="gym-btn"
                  onClick={() => startDay(confirming)}
                >
                  Los geht&apos;s
                </button>
                <button
                  type="button"
                  className="gym-btn gym-btn--ghost"
                  onClick={() => setConfirming(null)}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ---------- Übungsauswahl ----------
  if (picking) {
    // Haupt- wie Nebengruppe, Hauptgruppe zuerst: Wer „Brust" antippt,
    // will oben Bankdrücken sehen, nicht enge Liegestütze.
    const list =
      choice === null
        ? []
        : exercises
            .filter((e) => inGroup(e, choice))
            .sort((a, b) => {
              const ah = a.muscleGroup === choice ? 0 : 1;
              const bh = b.muscleGroup === choice ? 0 : 1;
              return ah - bh;
            });

    return (
      <main className="gym-shell" style={{ paddingTop: 22 }}>
        <button
          type="button"
          onClick={() => {
            if (choice && !swapping) return setChoice(null);
            setPicking(false);
            setChoice(null);
            setSwapping(null);
            if (slots.length === 0 && !day) setStarted(false);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--g-dim)",
            padding: 0,
            fontSize: "var(--pt-fs-md)",
          }}
        >
          ‹ Zurück
        </button>

        <h1 style={{ margin: "12px 0 6px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
          {choice ? muscleLabel(choice) : "Was trainierst du?"}
        </h1>

        {swapping ? (
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "var(--pt-fs-base)",
              color: "var(--g-dim)",
              lineHeight: 1.5,
            }}
          >
            Andere Übung im selben Muster — dein Verlauf läuft weiter.
          </p>
        ) : (
          <div style={{ height: 12 }} />
        )}

        {!choice ? (
          <>
            {recent.length > 0 && (
              <>
                <p className="gym-label" style={{ marginBottom: 8 }}>
                  Zuletzt benutzt
                </p>
                <div style={{ display: "grid", gap: 8, marginBottom: 22 }}>
                  {recent.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => addExercise(ex)}
                      className="gym-card"
                      style={{ textAlign: "left", cursor: "pointer" }}
                    >
                      <span style={{ fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
                        {ex.name}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "var(--pt-fs-sm)",
                          color: "var(--g-dim)",
                          marginTop: 2,
                        }}
                      >
                        {muscleSummary(ex)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="gym-label" style={{ marginBottom: 8 }}>
              Nach Muskelgruppe
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {MUSCLE_CHOICES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setChoice(g)}
                  className="gym-card"
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
                    {muscleLabel(g)}
                  </span>
                  <span style={{ color: "var(--g-dim)" }}>›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {list.map((ex) => {
              const pb = bests[ex.id];
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => addExercise(ex)}
                  className="gym-card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                >
                  <span style={{ fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
                    {ex.name}
                  </span>
                  {ex.setup && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "var(--pt-fs-sm)",
                        color: "var(--g-dim)",
                        marginTop: 3,
                        lineHeight: 1.45,
                      }}
                    >
                      {ex.setup}
                    </span>
                  )}
                  {pb && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "var(--pt-fs-sm)",
                        color: "var(--g-accent)",
                        marginTop: 4,
                      }}
                    >
                      Bestleistung:{" "}
                      {pb.isBodyweight
                        ? `${pb.reps} Wdh.`
                        : `${pb.weightKg} kg × ${pb.reps}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  // ---------- Ausführung ----------
  const codes = supersetCodes(
    slots
      .filter((s) => s.plan)
      .map((s) => ({ id: s.key, supersetGroup: s.plan!.supersetGroup })),
  );
  const focusSlot = focus
    ? slots.find((s) => s.key === focus.slotKey)
    : undefined;

  return (
    <main
      className="gym-shell"
      style={{ paddingTop: 18, paddingBottom: focus ? 420 : undefined }}
    >
      {/* Kopf mit Uhr */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="gym-label">{day ? planName : "Freies Training"}</p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
            {day ? day.title : "Heute"}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: "var(--pt-fs-xl)",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: paused ? "var(--g-dim)" : "var(--g-text)",
            }}
          >
            {clock(elapsed)}
          </span>
          <button
            type="button"
            className="gym-timerbtn"
            onClick={togglePause}
            aria-label={paused ? "Uhr fortsetzen" : "Uhr anhalten"}
            title={paused ? "Fortsetzen" : "Pause"}
          >
            {paused ? "▶" : "❚❚"}
          </button>
        </div>
      </div>

      {slots.length === 0 && (
        <div className="gym-card" style={{ marginBottom: 12 }}>
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-dim)",
              lineHeight: 1.55,
            }}
          >
            Füg deine erste Übung hinzu. Die Reihenfolge ist dir überlassen —
            dein Coach sieht später, welche Muster du trainiert hast.
          </p>
        </div>
      )}

      {slots.map((slot) => {
        const pb = bests[slot.exercise.id];
        const last = lastEfforts[slot.exercise.id];
        const code = codes.get(slot.key);
        const plan = slot.plan;

        return (
          <div key={slot.key} className="gym-card" style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 9, minWidth: 0 }}>
                {code && <span className="gym-code">{code}</span>}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
                    {slot.exercise.name}
                  </p>
                  {/* Aufbau statt Coaching-Sprache: damit steht der Athlet
                      jedes Mal identisch am Gerät. */}
                  {slot.exercise.setup && (
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "var(--pt-fs-sm)",
                        color: "var(--g-dim)",
                        lineHeight: 1.45,
                      }}
                    >
                      {slot.exercise.setup}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--g-dim)",
                    }}
                  >
                    {muscleLabel(
                      plan?.muscleGroup ?? slot.exercise.muscleGroup,
                    )}
                    {plan && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => {
                            setSwapping(slot.key);
                            setChoice(
                              plan.muscleGroup ?? slot.exercise.muscleGroup,
                            );
                            setPicking(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            font: "inherit",
                            color: "var(--g-accent)",
                            fontWeight: 600,
                            textDecoration: "underline",
                          }}
                        >
                          tauschen
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSlot(slot.key)}
                aria-label="Übung entfernen"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--g-dim)",
                  padding: "0 2px",
                  flex: "none",
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            {last && (
              <button
                type="button"
                className="gym-carry"
                onClick={() => applyLast(slot.key, last)}
              >
                <span style={{ fontWeight: 700 }}>
                  {last.weightKg === 0
                    ? `${last.reps} Wdh.`
                    : `${last.weightKg} kg × ${last.reps}`}
                </span>
                <span style={{ color: "var(--g-dim)" }}>
                  vom {dayMonthNumeric(new Date(last.on))} — übernehmen
                </span>
              </button>
            )}

            {plan?.note && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "var(--pt-fs-base)",
                  lineHeight: 1.5,
                  paddingLeft: 10,
                  borderLeft: "2px solid var(--g-border)",
                }}
              >
                {plan.note}
              </p>
            )}

            {/*
              Körpergewicht als Last.

              Bei Klimmzügen ist das kg-Feld nicht die Last, sondern nur
              das, was am Gürtel hängt. Wenn der Athlet das nicht sieht,
              trägt er irgendwann sein Körpergewicht ein — und die Zahl
              zählt doppelt.
            */}
            {slot.exercise.bodyweightFactor !== null && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--g-dim)",
                  lineHeight: 1.45,
                }}
              >
                {bodyLoad(slot.exercise) !== null
                  ? `Zählt mit ${bodyLoad(slot.exercise)} kg Körpergewicht. Ins kg-Feld nur, was du zusätzlich dranhängst.`
                  : "Trag dein Gewicht im Check-in ein — dann zählt diese Übung mit Last statt nur mit Wiederholungen."}
              </p>
            )}

            {/* Satztabelle */}
            <div style={{ marginTop: 14 }}>
              <div className="gym-setrow__head">
                <span />
                <span>
                  {slot.exercise.bodyweightFactor !== null &&
                  bodyLoad(slot.exercise) !== null
                    ? "+ kg"
                    : "kg"}
                </span>
                <span>Wdh.</span>
                <span>RIR</span>
                <span />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {slot.sets.map((set, i) => {
                  /*
                    Schlägt dieser Satz die bisherige Bestleistung?
                    Gerechnet wird auf dem, was gerade im Feld steht —
                    nicht auf einer gespeicherten Zeile. Sonst käme die
                    Antwort erst nach dem Training, und dann ist der
                    Moment vorbei.
                  */
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
                  <div key={i} className="gym-setrow" data-best={Boolean(rekord)}>
                    <span
                      style={{
                        fontSize: "var(--pt-fs-base)",
                        color: "var(--g-dim)",
                        textAlign: "center",
                      }}
                    >
                      {i + 1}
                    </span>
                    {FIELD_ORDER.map((field) => {
                      const value = set[field];
                      const active =
                        focus?.slotKey === slot.key &&
                        focus.setIndex === i &&
                        focus.field === field;
                      return (
                        <button
                          key={field}
                          type="button"
                          className="gym-cell"
                          data-empty={value === ""}
                          data-active={active}
                          onClick={() =>
                            setFocus({ slotKey: slot.key, setIndex: i, field })
                          }
                        >
                          {value === "" ? "–" : value}
                        </button>
                      );
                    })}

                    {/* Löschen gehört an die Zeile, nicht in ein Menü:
                        Im Studio wird ein Satz gestrichen, während man
                        noch daneben steht. Beim letzten Satz ohne
                        Funktion — dann bliebe eine Übung ohne Sätze. */}
                    <button
                      type="button"
                      className="gym-setdel"
                      disabled={slot.sets.length <= 1}
                      aria-label={`Satz ${i + 1} löschen`}
                      title={
                        slot.sets.length <= 1
                          ? "Der letzte Satz bleibt — nimm sonst die Übung raus"
                          : `Satz ${i + 1} löschen`
                      }
                      onClick={() => removeSet(slot.key, i)}
                    >
                      <IconX size={15} />
                    </button>

                    {/*
                      Der Moment. Steht in der Zeile, nicht als Fenster
                      davor: Ein Glückwunsch, den man wegtippen muss,
                      unterbricht das Training — und beim dritten Satz
                      ist er eine Belästigung.

                      Die Schwelle von einem Prozent steckt in
                      `beatsBest`. Ohne sie wäre jeder zweite Satz eine
                      „neue Bestleistung", und dann glaubt es niemand.
                    */}
                    {rekord && (
                      <span className="gym-best" aria-live="polite">
                        {bestLabel(rekord)}
                      </span>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Abweichung vom Plan — ehrlich benannt.
                Der Athlet darf Sätze ergänzen oder streichen, aber er
                soll nicht raten, ob das den Plan ändert. Tut es nicht:
                Der Plan gehört dem Trainer, heute gehört dem Athleten. */}
            {plan && slot.sets.length !== plan.targetSets && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--g-dim)",
                  lineHeight: 1.45,
                }}
              >
                {slot.sets.length > plan.targetSets
                  ? `${slot.sets.length} statt ${plan.targetSets} Sätzen`
                  : `${slot.sets.length} statt ${plan.targetSets} Sätzen`}{" "}
                — nur für heute. Dein Plan bleibt, wie er ist; dein Coach sieht,
                was du tatsächlich gemacht hast.
              </p>
            )}

            {/* Vorgabenfuß */}
            {plan && (
              <div className="gym-spec">
                <span>
                  {plan.targetSets} × {plan.targetRepsMin}
                  {plan.targetRepsMin !== plan.targetRepsMax &&
                    `–${plan.targetRepsMax}`}{" "}
                  Wdh.
                </span>
                {plan.tempo && <span>Tempo {plan.tempo}</span>}
                {plan.restSeconds !== null && (
                  <span>Pause {restLabel(plan.restSeconds)}</span>
                )}
              </div>
            )}

            {pb && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "var(--pt-fs-base)",
                  color: "var(--g-accent)",
                }}
              >
                Bestleistung{" "}
                {pb.isBodyweight
                  ? `${pb.reps} Wdh.`
                  : `${pb.weightKg} kg × ${pb.reps}`}
                <span style={{ color: "var(--g-dim)" }}>
                  {" "}
                  am {dayMonthNumeric(new Date(pb.on))}
                </span>
              </p>
            )}

            {slot.exercise.cue && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--g-dim)",
                  lineHeight: 1.5,
                }}
              >
                {slot.exercise.cue}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => addSet(slot.key)}
                className="gym-btn gym-btn--ghost"
                style={{ flex: 1, minHeight: 44, fontSize: "var(--pt-fs-md)" }}
              >
                Satz hinzufügen
              </button>
              {/* Für alles ohne Vorgabe: Pause von Hand. Die Vorgabe des
                  Slots hat Vorrang, sonst die Voreinstellung. */}
              <button
                type="button"
                onClick={() =>
                  beginRest(slot.key, plan?.restSeconds ?? DEFAULT_REST_SECONDS)
                }
                className="gym-btn gym-btn--ghost"
                style={{
                  flex: "none",
                  minHeight: 44,
                  fontSize: "var(--pt-fs-md)",
                  paddingInline: 16,
                }}
                aria-label={`Pause starten: ${restLabel(plan?.restSeconds ?? DEFAULT_REST_SECONDS)}`}
              >
                Pause
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setPicking(true)}
        className="gym-btn gym-btn--ghost"
        style={{ marginBottom: 12 }}
      >
        Übung hinzufügen
      </button>

      {error && (
        <p
          style={{ margin: "0 0 12px", color: "var(--g-accent)", fontSize: "var(--pt-fs-md)" }}
        >
          {error}
        </p>
      )}

      {slots.length > 0 && (
        <>
          <div className="gym-total">
            <span>
              {filledSets} {filledSets === 1 ? "Satz" : "Sätze"}
              {plannedSets > 0 && ` von ${plannedSets}`}
            </span>
            <span style={{ fontWeight: 700 }}>
              {Math.round(totalVolume).toLocaleString("de-DE")} kg gesamt
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEnding(true)}
            className="gym-btn"
            disabled={pending}
          >
            {pending ? "Speichert …" : "Training abschließen"}
          </button>
        </>
      )}

      {/* Ehrliches Beenden: unvollständig ist etwas anderes als nicht passiert. */}
      {ending && (
        <div
          className="gym-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Training abschließen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEnding(false);
          }}
        >
          <div className="gym-modal">
            <div
              className="gym-modal__mark"
              aria-hidden
              style={
                isComplete
                  ? undefined
                  : { background: "#fbefea", color: "var(--g-accent)" }
              }
            >
              {isComplete ? <IconCheck size={34} strokeWidth={2.6} /> : "!"}
            </div>
            <h2 style={{ margin: "18px 0 6px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
              {isComplete ? "Alles drin" : "Noch nicht alles ausgefüllt"}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "var(--pt-fs-md)",
                color: "var(--g-dim)",
                lineHeight: 1.55,
              }}
            >
              {isComplete
                ? `${filledSets} Sätze in ${clock(elapsed)} Minuten. Sauber.`
                : `${filledPlannedSets} von ${plannedSets} geplanten Sätzen sind eingetragen. Du kannst trotzdem abschließen — die Einheit wird dann als unvollständig gezählt.`}
            </p>

            {/*
              Volumenvergleich mit demselben Trainingstag.

              Nüchtern formuliert und ohne Lob: Ein schlechter Tag — krank,
              müde, schlecht geschlafen — soll sich nicht anfühlen, als
              hätte die App etwas dazu zu sagen. Die Bewertung gehört dem
              Trainer, die Zahl der App.
            */}
            {vergleich && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--g-canvas)",
                  border: "1px solid var(--g-border)",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-xs)",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--g-dim)",
                  }}
                >
                  {day?.title}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "var(--pt-fs-xl)",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <CountUp value={loadedVolume} format="volume" />
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "var(--pt-fs-base)",
                    color: "var(--g-dim)",
                    lineHeight: 1.45,
                  }}
                >
                  {vergleich.prozent === 0
                    ? "Genauso viel wie letztes Mal."
                    : `${Math.abs(vergleich.prozent)} % ${
                        vergleich.prozent > 0 ? "mehr" : "weniger"
                      } als letztes Mal (${
                        vergleich.delta > 0 ? "+" : "−"
                      }${volumeLabel(Math.abs(vergleich.delta))}).`}
                </p>
              </div>
            )}

            {/*
              Neue Bestleistungen dieser Einheit.

              Der Abschlussschirm nannte bisher Sätze, Zeit und Volumen
              — alles richtig, alles Buchhaltung. Das hier ist die
              Zeile, die man Freunden zeigt.

              Bewusst erst hier gesammelt und nicht schon während des
              Trainings gefeiert: In der Satzzeile steht die Pille
              beiläufig, hier steht die Bilanz. Zwei verschiedene
              Momente.
            */}
            {neueBestleistungen.length > 0 && (
              <div className="gym-pbs">
                <p className="gym-pbs__kopf">
                  {neueBestleistungen.length === 1
                    ? "Neue Bestleistung"
                    : `${neueBestleistungen.length} neue Bestleistungen`}
                </p>
                {neueBestleistungen.map((b) => (
                  <div key={b.name} className="gym-pbs__zeile">
                    <span>{b.name}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gap: 8, marginTop: 22 }}>
              <button
                type="button"
                className="gym-btn"
                onClick={save}
                disabled={pending}
              >
                {pending
                  ? "Speichert …"
                  : isComplete
                    ? "Speichern"
                    : "Trotzdem abschließen"}
              </button>
              <button
                type="button"
                className="gym-btn gym-btn--ghost"
                onClick={() => setEnding(false)}
              >
                Zurück zum Training
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        Pausenleiste und Ziffernblock teilen sich den unteren Rand.
        Zusammen in einem Behälter statt zwei getrennt schwebenden
        Elementen: Sonst müsste die Leiste die Höhe des Ziffernblocks
        kennen, um sich darüber zu setzen — und die ändert sich je nach
        Feld. Gestapelt ergibt sich das von selbst.
      */}
      {(rest || (focus && focusSlot)) && (
        <div className="gym-dock" data-pad={Boolean(focus && focusSlot)}>
          {/*
      Pausenleiste. Sitzt fest am unteren Rand, weil sie das Einzige
      ist, worauf der Athlet zwischen zwei Sätzen schaut — und weil er
      sie mit dem Daumen erreichen muss, ohne die Hand umzugreifen.
    */}
          {rest && (
            <div
              className="gym-rest"
              data-over={restLeft === 0}
              role="timer"
              aria-live="off"
            >
              <div
                className="gym-rest__fill"
                style={{
                  width: `${Math.round(restProgress(rest, now) * 100)}%`,
                }}
                aria-hidden
              />
              <div className="gym-rest__row">
                <div style={{ minWidth: 0 }}>
                  <p className="gym-rest__label">
                    {restLeft === 0 ? "Pause vorbei" : "Pause"}
                  </p>
                  <p className="gym-rest__time">{restClock(restLeft)}</p>
                </div>

                <div className="gym-rest__actions">
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
          )}
          {focus && focusSlot && (
            <Numpad
              kind={focus.field}
              addedWeight={
                focusSlot.exercise.bodyweightFactor !== null &&
                bodyLoad(focusSlot.exercise) !== null
              }
              value={focusSlot.sets[focus.setIndex]?.[focus.field] ?? ""}
              title={focusSlot.exercise.name}
              isLast={isLastField}
              onChange={(v) => updateCell(focus, v)}
              onNext={advance}
              onClose={() => setFocus(null)}
            />
          )}
        </div>
      )}
    </main>
  );
}
