"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  MovementPattern,
  MuscleGroup,
  PlanSlot,
  TrainingBlock,
} from "@ptfive/types";
import { BLOCK_ORDER } from "@ptfive/types";
import { IconPlus, IconX } from "@/app/icons";
import {
  MUSCLE_CHOICES,
  PATTERN_CHOICES,
  choiceLabel,
  inGroup,
  muscleLabel,
  muscleSummary,
  patternForGroup,
  patternToChoice,
  type PatternChoice,
} from "@/app/components";
import {
  addSlotAction,
  createExerciseAction,
  updateSlotAction,
  type SlotInput,
} from "../actions";
import { useT } from "@/app/i18n/client";
import { dictFor } from "@/app/i18n";

export interface ExercisePick {
  id: string;
  name: string;
  /** Läuft unter der Oberfläche mit — der Slot verbucht damit. */
  pattern: MovementPattern | null;
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  defaultBlock: TrainingBlock;
  /** true = vom Coach selbst angelegt. */
  own?: boolean;
}

/** Typische Spannen je Block — als Startwert, nicht als Vorschrift. */
const BLOCK_DEFAULTS: Record<
  TrainingBlock,
  { sets: number; min: number; max: number }
> = {
  compound: { sets: 4, min: 5, max: 8 },
  functional: { sets: 3, min: 8, max: 12 },
  isolation: { sets: 3, min: 10, max: 15 },
  core: { sets: 3, min: 12, max: 20 },
};

export function SlotForm({
  dayId,
  planId,
  slot,
  exercises,
  recentIds,
  onClose,
  onDone,
}: {
  dayId: string;
  planId: string;
  /** Gesetzt = bearbeiten, sonst neu anlegen. */
  slot?: PlanSlot;
  exercises: ExercisePick[];
  /** Zuletzt in Plänen benutzte Übungen, jüngste zuerst. */
  recentIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const S = t.coach.slot;
  const K = t.coach.picker;

  /*
    Zwei Schritte statt eines langen Formulars (Joëls Punkt 4).

    Vorher kam zuerst die Muskelgruppe, dann eine Auswahlliste der
    Übungen darin. Joël denkt umgekehrt: erst die Übung — „Bankdrücken"
    —, und die Muskelgruppe folgt daraus. Also beim Anlegen zuerst die
    Auswahl mit Suche, „Zuletzt benutzt" und Filtern; danach Sätze,
    Wiederholungen und Hinweis. Beim Bearbeiten steht man gleich im
    zweiten Schritt, die Übung lässt sich dort wechseln.
  */
  const [step, setStep] = useState<"pick" | "details">(slot ? "details" : "pick");

  const [group, setGroup] = useState<MuscleGroup>(slot?.muscleGroup ?? "chest");
  const [block, setBlock] = useState<TrainingBlock>(slot?.block ?? "compound");
  const [label, setLabel] = useState(slot?.label ?? "");
  const [exerciseId, setExerciseId] = useState(slot?.defaultExerciseId ?? "");
  const [sets, setSets] = useState(slot?.targetSets ?? 4);
  const [repsMin, setRepsMin] = useState(slot?.targetRepsMin ?? 5);
  const [repsMax, setRepsMax] = useState(slot?.targetRepsMax ?? 8);
  const [note, setNote] = useState(slot?.note ?? "");
  const [superset, setSuperset] = useState(slot?.supersetGroup ?? "");
  const [tempo, setTempo] = useState(slot?.tempo ?? "");
  const [rest, setRest] = useState(
    slot?.restSeconds !== null && slot?.restSeconds !== undefined
      ? String(slot.restSeconds)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Auswahl
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [moveFilter, setMoveFilter] = useState<PatternChoice | null>(null);

  // Eigene Übung direkt hier anlegen — sonst müsste der Coach mitten im
  // Planen die Seite wechseln und käme mit leerem Formular zurück.
  const [newExercise, setNewExercise] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState<MuscleGroup>("chest");
  const [newBodyweight, setNewBodyweight] = useState(false);
  const [extra, setExtra] = useState<ExercisePick[]>([]);

  const alle = useMemo(
    () =>
      [...exercises, ...extra].sort((a, b) => a.name.localeCompare(b.name, t.locale)),
    [exercises, extra, t],
  );
  const chosen = alle.find((e) => e.id === exerciseId);

  /**
   * Ist die Bezeichnung noch die automatische?
   *
   * Nur dann wird sie mitgezogen. Sobald der Trainer selbst etwas
   * eingetippt hat, gehört sie ihm. In BEIDEN Sprachen geprüft: Ein
   * Slot, der unter Deutsch „Brust" bekommen hat, ist auch nach dem
   * Umschalten noch automatisch benannt.
   */
  function istAutomatisch(aktuell: string): boolean {
    if (aktuell.trim() === "") return true;
    const automatisch = (["de", "en"] as const).some((l) =>
      MUSCLE_CHOICES.some((g) => muscleLabel(dictFor(l), g) === aktuell),
    );
    if (automatisch) return true;
    return alle.some((e) => e.name === aktuell);
  }

  /** Startwerte des Blocks — nur beim Anlegen, beim Bearbeiten wären
   *  sie eine überschriebene Entscheidung des Trainers. */
  function blockStart(next: TrainingBlock) {
    setBlock(next);
    if (!slot) {
      const d = BLOCK_DEFAULTS[next];
      setSets(d.sets);
      setRepsMin(d.min);
      setRepsMax(d.max);
    }
  }

  function pick(e: ExercisePick) {
    setExerciseId(e.id);
    setGroup(e.muscleGroup);
    if (!slot) blockStart(e.defaultBlock);
    if (istAutomatisch(label)) setLabel(e.name);
    setStep("details");
  }

  function pickNone() {
    setExerciseId("");
    if (istAutomatisch(label)) setLabel(muscleLabel(t, group));
    setStep("details");
  }

  function pickGroup(next: MuscleGroup) {
    setGroup(next);
    if (!chosen && istAutomatisch(label)) setLabel(muscleLabel(t, next));
    // Rumpfarbeit gehört per Definition in den Rumpf-Block.
    if (next === "core" && !slot) blockStart("core");
  }

  function createExercise() {
    const name = (newExercise ?? "").trim();
    if (name === "") return;
    setError(null);
    startTransition(async () => {
      const result = await createExerciseAction({
        name,
        muscleGroup: newGroup,
        // Das Muster kommt aus der Gruppe — der Trainer soll es nicht
        // nebenbei mit entscheiden müssen.
        pattern: patternForGroup(newGroup),
        block: newGroup === "core" ? "core" : "compound",
        isBodyweight: newBodyweight,
        cue: null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const neu: ExercisePick = {
        id: result.id,
        name: result.name,
        pattern: patternForGroup(newGroup),
        muscleGroup: newGroup,
        secondaryMuscleGroups: [],
        defaultBlock: newGroup === "core" ? "core" : "compound",
        own: true,
      };
      // Sofort auswählbar, ohne Neuladen.
      setExtra((prev) => [...prev, neu]);
      setNewExercise(null);
      setNewBodyweight(false);
      pick(neu);
    });
  }

  const gefiltert = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alle
      .filter((e) => (term === "" ? true : e.name.toLowerCase().includes(term)))
      .filter((e) => (muscleFilter ? inGroup(e, muscleFilter) : true))
      .filter((e) => (moveFilter ? patternToChoice(e.pattern) === moveFilter : true))
      .sort((a, b) => {
        // Bei Muskelgruppe: Hauptgruppe vor Nebengruppe — wer „Brust"
        // antippt, will oben Bankdrücken sehen, nicht enge Liegestütze.
        if (!muscleFilter) return 0;
        const ah = a.muscleGroup === muscleFilter ? 0 : 1;
        const bh = b.muscleGroup === muscleFilter ? 0 : 1;
        return ah - bh;
      });
  }, [alle, search, muscleFilter, moveFilter]);

  const ohneFilter = search.trim() === "" && !muscleFilter && !moveFilter;
  const zuletzt = recentIds
    .map((id) => alle.find((e) => e.id === id))
    .filter((e): e is ExercisePick => Boolean(e));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: SlotInput = {
      muscleGroup: group,
      // Steht eine Übung im Slot, gilt deren Muster: Sie weiss genauer,
      // was sie ist, als die Gruppe es sagen kann. Sonst der Rückfall.
      pattern: chosen ? chosen.pattern : patternForGroup(group),
      block,
      label: label.trim() === "" ? (chosen?.name ?? muscleLabel(t, group)) : label,
      defaultExerciseId: exerciseId === "" ? null : exerciseId,
      targetSets: sets,
      targetRepsMin: repsMin,
      targetRepsMax: repsMax,
      supersetGroup: superset === "" ? null : superset,
      tempo: tempo.trim() === "" ? null : tempo.trim().toUpperCase(),
      restSeconds: rest.trim() === "" ? null : Number(rest),
      note: note.trim() === "" ? null : note.trim(),
    };

    startTransition(async () => {
      const result = slot
        ? await updateSlotAction(slot.id, planId, input)
        : await addSlotAction(dayId, planId, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  const kopf = (titel: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>{titel}</h2>
      <button type="button" className="pt-iconbtn" onClick={onClose} aria-label={t.common.close}>
        <IconX size={17} />
      </button>
    </div>
  );

  const zeile = (e: ExercisePick) => (
    <button
      key={e.id}
      type="button"
      className="pt-pickrow"
      onClick={() => pick(e)}
      data-active={e.id === exerciseId}
    >
      <span style={{ minWidth: 0, textAlign: "left" }}>
        <span style={{ display: "block", fontWeight: 600 }}>
          {e.name}
          {e.own ? S.ownSuffix : ""}
        </span>
        <span
          style={{
            display: "block",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
            marginTop: 1,
          }}
        >
          {muscleSummary(t, e)}
        </span>
      </span>
    </button>
  );

  // ---------- Schritt 1: Übung wählen ----------
  if (step === "pick") {
    return (
      <div
        className="pt-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={K.title}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="pt-sheet">
          {kopf(K.title)}

          <input
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            placeholder={K.search}
            aria-label={K.search}
          />

          <p className="pt-label" style={{ margin: "12px 0 6px" }}>
            {K.byMuscle}
          </p>
          <div className="pt-chiprow">
            <button
              type="button"
              className="pt-toggle"
              data-active={muscleFilter === null}
              onClick={() => setMuscleFilter(null)}
            >
              {K.all}
            </button>
            {MUSCLE_CHOICES.map((g) => (
              <button
                key={g}
                type="button"
                className="pt-toggle"
                data-active={muscleFilter === g}
                aria-pressed={muscleFilter === g}
                onClick={() => setMuscleFilter(muscleFilter === g ? null : g)}
              >
                {muscleLabel(t, g)}
              </button>
            ))}
          </div>

          <p className="pt-label" style={{ margin: "10px 0 6px" }}>
            {K.byMovement}
          </p>
          <div className="pt-chiprow">
            <button
              type="button"
              className="pt-toggle"
              data-active={moveFilter === null}
              onClick={() => setMoveFilter(null)}
            >
              {K.all}
            </button>
            {PATTERN_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className="pt-toggle"
                data-active={moveFilter === c}
                aria-pressed={moveFilter === c}
                onClick={() => setMoveFilter(moveFilter === c ? null : c)}
              >
                {choiceLabel(t, c)}
              </button>
            ))}
          </div>

          <div className="pt-picklist">
            {ohneFilter && zuletzt.length > 0 && (
              <>
                <p className="pt-label" style={{ margin: "4px 0 2px" }}>
                  {K.recent}
                </p>
                {zuletzt.map(zeile)}
                <p className="pt-label" style={{ margin: "12px 0 2px" }}>
                  {K.all}
                </p>
              </>
            )}
            {!ohneFilter && (
              <p style={{ margin: "4px 0", fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                {K.results(gefiltert.length)}
              </p>
            )}
            {gefiltert.length === 0 ? (
              <p style={{ margin: "6px 0", fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
                {K.nothing}
              </p>
            ) : (
              gefiltert.map(zeile)
            )}
          </div>

          {newExercise === null ? (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => {
                  setNewExercise(search.trim());
                  setNewGroup(muscleFilter ?? "chest");
                }}
              >
                <IconPlus size={14} />
                {K.createOwn}
              </button>
              <button type="button" className="pt-btn pt-btn--ghost" onClick={pickNone}>
                {K.noExercise}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 12,
                padding: 12,
                background: "#faf8f5",
                border: "1px solid var(--pt-border)",
                borderRadius: 9,
              }}
            >
              <input
                value={newExercise}
                autoFocus
                placeholder={S.exerciseName}
                onChange={(e) => setNewExercise(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setNewExercise(null);
                }}
              />
              <label style={{ display: "grid", gap: 4 }}>
                <span className="pt-label">{K.ownGroup}</span>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}
                >
                  {MUSCLE_CHOICES.map((g) => (
                    <option key={g} value={g}>
                      {muscleLabel(t, g)}
                    </option>
                  ))}
                </select>
              </label>
              <label
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--pt-fs-base)" }}
              >
                <input
                  type="checkbox"
                  checked={newBodyweight}
                  onChange={(e) => setNewBodyweight(e.target.checked)}
                  style={{ width: "auto" }}
                />
                {S.bodyweight}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="pt-btn"
                  disabled={pending || newExercise.trim() === ""}
                  onClick={createExercise}
                >
                  {S.create}
                </button>
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost"
                  onClick={() => setNewExercise(null)}
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p style={{ margin: "10px 0 0", fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---------- Schritt 2: Vorgaben ----------
  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={slot ? S.edit : S.add}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form onSubmit={submit} className="pt-sheet">
        {kopf(slot ? S.edit : S.add)}

        <div style={{ display: "grid", gap: 16 }}>
          {/* Die gewählte Übung — oben, weil alles darunter von ihr abhängt. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid var(--pt-border)",
              borderRadius: 10,
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span className="pt-label" style={{ display: "block" }}>
                {K.exercise}
              </span>
              <span style={{ display: "block", fontWeight: 600, marginTop: 2 }}>
                {chosen ? chosen.name : K.none}
              </span>
              {chosen && (
                <span style={{ display: "block", fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                  {muscleSummary(t, chosen)}
                </span>
              )}
            </span>
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              style={{ flex: "none" }}
              onClick={() => setStep("pick")}
            >
              {K.change}
            </button>
          </div>

          {/* Ohne feste Übung trägt die Muskelgruppe den Slot — dann
              muss man sie wählen können. Mit Übung folgt sie aus ihr. */}
          {!chosen && (
            <div>
              <span className="pt-label" style={{ display: "block", marginBottom: 7 }}>
                {S.muscleGroup}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MUSCLE_CHOICES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="pt-toggle"
                    data-active={group === g}
                    aria-pressed={group === g}
                    onClick={() => pickGroup(g)}
                  >
                    {muscleLabel(t, g)}
                  </button>
                ))}
              </div>
              {group === "core" && (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                    lineHeight: 1.45,
                  }}
                >
                  {S.coreHint}
                </p>
              )}
            </div>
          )}

          {/* Sätze, Wdh. von, Wdh. bis. Am Laptop drei nebeneinander,
              auf dem Handy zwei, auf sehr schmalen Geräten eins —
              drei Zahlenfelder auf 375px wären je 110px breit. */}
          <div className="pt-cols pt-cols--3">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{S.sets}</span>
              <input
                type="number"
                min={1}
                max={12}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value))}
                required
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{S.repsFrom}</span>
              <input
                type="number"
                min={1}
                max={100}
                value={repsMin}
                onChange={(e) => setRepsMin(Number(e.target.value))}
                required
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{S.repsTo}</span>
              <input
                type="number"
                min={1}
                max={100}
                value={repsMax}
                onChange={(e) => setRepsMax(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">{S.note}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={S.notePlaceholder}
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </label>

          <div className="pt-cols">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{S.tempo}</span>
              <input
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="3111"
                maxLength={4}
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
              <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                {S.tempoHint}
              </span>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{S.rest}</span>
              <input
                type="number"
                min={0}
                max={900}
                step={15}
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                placeholder="60"
              />
              <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                {S.restHint}
              </span>
            </label>
          </div>

          <div>
            <span className="pt-label" style={{ display: "block", marginBottom: 7 }}>
              {S.superset}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                className="pt-toggle"
                data-active={superset === ""}
                onClick={() => setSuperset("")}
              >
                {S.single}
              </button>
              {["A", "B", "C", "D", "E"].map((g) => (
                <button
                  key={g}
                  type="button"
                  className="pt-toggle"
                  data-active={superset === g}
                  onClick={() => setSuperset(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.45,
              }}
            >
              {S.supersetHint}
            </p>
          </div>

          <div>
            <span className="pt-label" style={{ display: "block", marginBottom: 7 }}>
              {S.block}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BLOCK_ORDER.map((b) => (
                <button
                  key={b}
                  type="button"
                  className="pt-toggle"
                  data-active={block === b}
                  onClick={() => blockStart(b)}
                >
                  {t.labels.block[b]}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">{S.label}</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={chosen?.name ?? S.labelPlaceholder}
            />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="pt-btn" disabled={pending}>
              {pending ? t.common.saving : slot ? S.save : S.addButton}
            </button>
            <button type="button" className="pt-btn pt-btn--ghost" onClick={onClose}>
              {t.common.cancel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
