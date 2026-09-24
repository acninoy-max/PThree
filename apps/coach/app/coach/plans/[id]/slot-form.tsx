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
  inGroup,
  muscleLabel,
  patternForGroup,
} from "@/app/components";
import {
  addSlotAction,
  createExerciseAction,
  updateSlotAction,
  type SlotInput,
} from "../actions";

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

export const BLOCK_LABEL: Record<TrainingBlock, string> = {
  compound: "Grundübung",
  functional: "Funktionell",
  isolation: "Isolation",
  core: "Rumpf",
};

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
  onClose,
  onDone,
}: {
  dayId: string;
  planId: string;
  /** Gesetzt = bearbeiten, sonst neu anlegen. */
  slot?: PlanSlot;
  exercises: ExercisePick[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [group, setGroup] = useState<MuscleGroup>(slot?.muscleGroup ?? "chest");
  const [block, setBlock] = useState<TrainingBlock>(slot?.block ?? "compound");
  const [label, setLabel] = useState(slot?.label ?? muscleLabel("chest"));
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

  // Eigene Übung direkt hier anlegen — sonst müsste der Coach mitten im
  // Planen die Seite wechseln und käme mit leerem Formular zurück.
  const [newExercise, setNewExercise] = useState<string | null>(null);
  const [newBodyweight, setNewBodyweight] = useState(false);
  const [extra, setExtra] = useState<ExercisePick[]>([]);

  function createExercise() {
    const name = (newExercise ?? "").trim();
    if (name === "") return;
    setError(null);
    startTransition(async () => {
      const result = await createExerciseAction({
        name,
        muscleGroup: group,
        // Das Muster kommt aus der Gruppe — der Trainer soll es nicht
        // nebenbei mit entscheiden müssen.
        pattern: patternForGroup(group),
        block,
        isBodyweight: newBodyweight,
        cue: null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Sofort auswählbar, ohne Neuladen.
      setExtra((prev) => [
        ...prev,
        {
          id: result.id,
          name: result.name,
          pattern: patternForGroup(group),
          muscleGroup: group,
          secondaryMuscleGroups: [],
          defaultBlock: block,
          own: true,
        },
      ]);
      setExerciseId(result.id);
      if (istAutomatisch(label)) setLabel(result.name);
      setNewExercise(null);
      setNewBodyweight(false);
    });
  }

  /**
   * Übungen der gewählten Gruppe — Haupt- wie Nebengruppe.
   *
   * Sortiert: erst die, für die es die Hauptgruppe ist, dann die
   * Mitläufer. Wer „Brust" wählt, will oben Bankdrücken sehen und nicht
   * enge Liegestütze, nur weil das Alphabet es so will.
   */
  const options = useMemo(
    () =>
      [...exercises, ...extra]
        .filter((e) => inGroup(e, group))
        .sort((a, b) => {
          const ah = a.muscleGroup === group ? 0 : 1;
          const bh = b.muscleGroup === group ? 0 : 1;
          return ah !== bh ? ah - bh : a.name.localeCompare(b.name, "de");
        }),
    [exercises, extra, group],
  );

  /**
   * Ist die Bezeichnung noch die automatische?
   *
   * Nur dann wird sie mitgezogen. Sobald der Trainer selbst etwas
   * eingetippt hat, gehört sie ihm — dann fasst sie niemand mehr an.
   */
  function istAutomatisch(aktuell: string): boolean {
    if (MUSCLE_CHOICES.some((g) => muscleLabel(g) === aktuell)) return true;
    return [...exercises, ...extra].some((e) => e.name === aktuell);
  }

  /** Übung wählen — die Bezeichnung im Plan folgt der Übung. */
  function pickExercise(id: string) {
    setExerciseId(id);
    if (!istAutomatisch(label)) return;
    const gewaehlt = [...exercises, ...extra].find((e) => e.id === id);
    // Ohne Übung fällt die Bezeichnung auf die Muskelgruppe zurück —
    // dann ist sie das Einzige, was den Slot beschreibt.
    setLabel(gewaehlt ? gewaehlt.name : muscleLabel(group));
  }

  function pickGroup(next: MuscleGroup) {
    setGroup(next);
    // Bezeichnung mitziehen, solange der Trainer sie nicht selbst
    // angepasst hat — ein eigener Name ist eine Entscheidung.
    if (istAutomatisch(label)) setLabel(muscleLabel(next));
    // Die gewählte Übung gehört vielleicht nicht zur neuen Gruppe.
    if (
      ![...exercises, ...extra].some(
        (e) => e.id === exerciseId && inGroup(e, next),
      )
    ) {
      setExerciseId("");
    }
    // Rumpfarbeit gehört per Definition in den Rumpf-Block.
    if (next === "core" && !slot) setBlock("core");
  }

  function pickBlock(next: TrainingBlock) {
    setBlock(next);
    // Beim Anlegen die typische Spanne übernehmen; beim Bearbeiten würde
    // das die bewusste Entscheidung des Coaches überschreiben.
    if (!slot) {
      const d = BLOCK_DEFAULTS[next];
      setSets(d.sets);
      setRepsMin(d.min);
      setRepsMax(d.max);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Steht eine Übung im Slot, gilt deren Muster: Sie weiss genauer, was
    // sie ist, als die Gruppe es sagen kann. Sonst der Rückfall.
    const chosen = options.find((e) => e.id === exerciseId);

    const input: SlotInput = {
      muscleGroup: group,
      pattern: chosen ? chosen.pattern : patternForGroup(group),
      block,
      label,
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

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={slot ? "Slot bearbeiten" : "Slot hinzufügen"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form onSubmit={submit} className="pt-sheet">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
            {slot ? "Slot bearbeiten" : "Slot hinzufügen"}
          </h2>
          <button
            type="button"
            className="pt-iconbtn"
            onClick={onClose}
            aria-label="Schließen"
          >
            <IconX size={17} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              Muskelgruppe
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
                  {muscleLabel(g)}
                </button>
              ))}
            </div>
          </div>

          {group === "core" && (
            <p
              style={{
                margin: "-6px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.45,
              }}
            >
              Rumpfarbeit wird geloggt und steht im Plan, läuft aber ohne
              Kraftkurve — sonst würde ein Plank die Kreuzheben-Zahlen
              verwässern.
            </p>
          )}

          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              Block
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BLOCK_ORDER.map((b) => (
                <button
                  key={b}
                  type="button"
                  className="pt-toggle"
                  data-active={block === b}
                  onClick={() => pickBlock(b)}
                >
                  {BLOCK_LABEL[b]}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Bezeichnung im Plan</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z. B. Oberkörper drücken"
              required
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Vorschlagsübung</span>
            <select
              value={exerciseId}
              onChange={(e) => pickExercise(e.target.value)}
            >
              <option value="">Keine — Athlet wählt selbst</option>
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.own ? " (eigene)" : ""}
                </option>
              ))}
            </select>

            {newExercise === null ? (
              <button
                type="button"
                onClick={() => setNewExercise("")}
                style={{
                  justifySelf: "start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "var(--pt-fs-base)",
                  fontWeight: 600,
                  color: "var(--pt-action)",
                }}
              >
                <IconPlus size={14} />
                Übung fehlt? Eigene anlegen
              </button>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  background: "#faf8f5",
                  border: "1px solid var(--pt-border)",
                  borderRadius: 9,
                }}
              >
                <input
                  value={newExercise}
                  autoFocus
                  placeholder="Name der Übung"
                  onChange={(e) => setNewExercise(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setNewExercise(null);
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "var(--pt-fs-base)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newBodyweight}
                    onChange={(e) => setNewBodyweight(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  Körpergewichtsübung
                </label>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                    lineHeight: 1.45,
                  }}
                >
                  Wird als „{muscleLabel(group)} · {BLOCK_LABEL[block]}"
                  gespeichert und steht dir ab sofort in allen Plänen zur
                  Verfügung.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="pt-btn"
                    disabled={pending || newExercise.trim() === ""}
                    onClick={createExercise}
                  >
                    Anlegen
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost"
                    onClick={() => setNewExercise(null)}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              Nur ein Vorschlag. Der Athlet darf im Slot tauschen — die
              Musterhistorie läuft trotzdem weiter.
            </span>
          </label>

          {/* Sätze, Wdh. von, Wdh. bis. Am Laptop drei nebeneinander,
              auf dem Handy zwei, auf sehr schmalen Geräten eins —
              drei Zahlenfelder auf 375px wären je 110px breit. */}
          <div className="pt-cols pt-cols--3">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Sätze</span>
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
              <span className="pt-label">Wdh. von</span>
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
              <span className="pt-label">bis</span>
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

          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              Supersatz
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                className="pt-toggle"
                data-active={superset === ""}
                onClick={() => setSuperset("")}
              >
                Einzeln
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
              Slots mit demselben Buchstaben werden ohne Pause dazwischen
              ausgeführt. Der Athlet sieht sie als A1, A2, A3.
            </p>
          </div>

          <div className="pt-cols">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Tempo</span>
              <input
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="3111"
                maxLength={4}
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
              <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                Ab, unten, auf, oben. X = explosiv.
              </span>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Pause (Sekunden)</span>
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
                Leer = keine Vorgabe.
              </span>
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Hinweis für den Athleten</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="z. B. letzte zwei Sätze bis kurz vors Versagen"
              style={{
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="pt-btn" disabled={pending}>
              {pending
                ? "Wird gespeichert …"
                : slot
                  ? "Speichern"
                  : "Hinzufügen"}
            </button>
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              onClick={onClose}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
