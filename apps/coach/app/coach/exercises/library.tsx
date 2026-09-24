"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExerciseFull } from "@ptfive/db";
import type { MuscleGroup, TrainingBlock } from "@ptfive/types";
import { BLOCK_ORDER } from "@ptfive/types";
import { IconPlus, IconX } from "@/app/icons";
import {
  MUSCLE_CHOICES,
  inGroup,
  muscleLabel,
  muscleSummary,
  patternForGroup,
} from "@/app/components";
import { BLOCK_LABEL } from "@/app/coach/plans/[id]/slot-form";
import {
  createExerciseAction,
  deleteExerciseAction,
} from "@/app/coach/plans/actions";

function NewExercise({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("chest");
  // Nebengruppen: nur für die Suche. Deshalb getrennt von der Hauptgruppe
  // und nicht als gleichrangige Liste.
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [block, setBlock] = useState<TrainingBlock>("compound");
  const [bodyweight, setBodyweight] = useState(false);
  const [cue, setCue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createExerciseAction({
        name,
        muscleGroup: group,
        secondaryMuscleGroups: secondary.filter((g) => g !== group),
        // Das Muster leitet sich aus der Gruppe ab — der Trainer soll
        // sich nicht mit zwei Ordnungssystemen beschäftigen müssen.
        pattern: patternForGroup(group),
        block,
        isBodyweight: bodyweight,
        cue: cue.trim() === "" ? null : cue,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Übung anlegen"
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
            Eigene Übung anlegen
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
          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Name</span>
            <input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Landmine Row"
              required
            />
          </label>

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
                  onClick={() => {
                    setGroup(g);
                    // Die Hauptgruppe kann nicht zugleich Nebengruppe sein.
                    setSecondary((prev) => prev.filter((x) => x !== g));
                    if (g === "core") setBlock("core");
                  }}
                >
                  {muscleLabel(g)}
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
                Rumpfarbeit wird geloggt, läuft aber ohne Kraftkurve.
              </p>
            )}
          </div>

          {/* Nebengruppen — optional. Sie erweitern nur, wo die Übung
              gefunden wird; gezählt wird weiter über die Hauptgruppe,
              sonst stünde dasselbe Volumen in zwei Statistiken. */}
          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              Auch zu finden unter (optional)
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MUSCLE_CHOICES.filter((g) => g !== group).map((g) => {
                const on = secondary.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className="pt-toggle"
                    data-active={on}
                    aria-pressed={on}
                    onClick={() =>
                      setSecondary((prev) =>
                        on ? prev.filter((x) => x !== g) : [...prev, g],
                      )
                    }
                  >
                    {muscleLabel(g)}
                  </button>
                );
              })}
            </div>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.45,
              }}
            >
              {secondary.length === 0
                ? "Nur unter der Hauptgruppe zu finden."
                : `Erscheint zusätzlich unter ${secondary
                    .map((g) => muscleLabel(g))
                    .join(", ")}.`}
            </p>
          </div>

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
                  onClick={() => setBlock(b)}
                >
                  {BLOCK_LABEL[b]}
                </button>
              ))}
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "var(--pt-fs-md)",
            }}
          >
            <input
              type="checkbox"
              checked={bodyweight}
              onChange={(e) => setBodyweight(e.target.checked)}
              style={{ width: "auto" }}
            />
            Körpergewichtsübung
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Ansage beim Loggen</span>
            <textarea
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              rows={2}
              placeholder="z. B. Ellenbogen eng am Körper führen"
              style={{
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              Erscheint dem Athleten in der App unter der Übung.
            </span>
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="pt-btn" disabled={pending}>
            {pending ? "Wird angelegt …" : "Anlegen"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ExerciseLibrary({ exercises }: { exercises: ExerciseFull[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<MuscleGroup | "all">("all");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((e) => {
      if (filter !== "all" && !inGroup(e, filter)) return false;
      if (term !== "" && !e.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [exercises, filter, search]);

  const own = shown.filter((e) => e.coachId !== null);
  const global = shown.filter((e) => e.coachId === null);

  function remove(id: string) {
    startTransition(async () => {
      await deleteExerciseAction(id);
      router.refresh();
    });
  }

  function Row({ e }: { e: ExerciseFull }) {
    return (
      <div className="pt-slot">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>{e.name}</span>
            <span className="pt-chip">{BLOCK_LABEL[e.block]}</span>
            {e.isBodyweight && <span className="pt-chip">Körpergewicht</span>}
          </div>
          <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
            {muscleSummary(e)}
            {e.cue ? ` · ${e.cue}` : ""}
          </p>
        </div>

        {e.coachId !== null && (
          <div className="pt-slot__actions">
            <button
              type="button"
              title="Löschen"
              aria-label={`${e.name} löschen`}
              disabled={pending}
              onClick={() => remove(e.id)}
            >
              <IconX size={13} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="pt-shell">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <p className="pt-label" style={{ margin: 0 }}>
            Übungen
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            {exercises.length} in deiner Bibliothek
          </h1>
        </div>
        <button
          type="button"
          className="pt-btn"
          onClick={() => setCreating(true)}
        >
          <IconPlus size={17} />
          Eigene Übung
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen …"
          style={{ maxWidth: 240 }}
        />
        <button
          type="button"
          className="pt-toggle"
          data-active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Alle
        </button>
        {MUSCLE_CHOICES.map((g) => (
          <button
            key={g}
            type="button"
            className="pt-toggle"
            data-active={filter === g}
            aria-pressed={filter === g}
            onClick={() => setFilter(g)}
          >
            {muscleLabel(g)}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720 }}>
        {own.length > 0 && (
          <>
            <p className="pt-label" style={{ marginBottom: 8 }}>
              Deine Übungen
            </p>
            <div style={{ display: "grid", gap: 6, marginBottom: 24 }}>
              {own.map((e) => (
                <Row key={e.id} e={e} />
              ))}
            </div>
          </>
        )}

        <p className="pt-label" style={{ marginBottom: 8 }}>
          Bibliothek
        </p>
        {global.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              Keine Übung passt zu Suche und Filter.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {global.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </div>
        )}
      </div>

      {creating && <NewExercise onClose={() => setCreating(false)} />}
    </main>
  );
}
