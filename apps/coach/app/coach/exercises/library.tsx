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
import { useT } from "@/app/i18n/client";
import {
  createExerciseAction,
  deleteExerciseAction,
} from "@/app/coach/plans/actions";

function NewExercise({ onClose }: { onClose: () => void }) {
  const t = useT();
  const B = t.coach.library;
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
      aria-label={B.createAria}
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
            {B.createTitle}
          </h2>
          <button
            type="button"
            className="pt-iconbtn"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <IconX size={17} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">{B.name}</span>
            <input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder={B.namePlaceholder}
              required
            />
          </label>

          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              {B.muscleGroup}
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
                {B.coreNoCurve}
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
              {B.alsoFound}
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
                    {muscleLabel(t, g)}
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
                ? B.onlyMain
                : B.alsoUnder(secondary.map((g) => muscleLabel(t, g)).join(", "))}
            </p>
          </div>

          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              {B.block}
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
                  {t.labels.block[b]}
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
            {B.bodyweight}
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">{B.cue}</span>
            <textarea
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              rows={2}
              placeholder={B.cuePlaceholder}
              style={{
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {B.cueHint}
            </span>
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="pt-btn" disabled={pending}>
            {pending ? B.creating : B.create}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ExerciseLibrary({ exercises }: { exercises: ExerciseFull[] }) {
  const t = useT();
  const B = t.coach.library;
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
            <span className="pt-chip">{t.labels.block[e.block]}</span>
            {e.isBodyweight && <span className="pt-chip">{B.bodyweightChip}</span>}
          </div>
          <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
            {muscleSummary(t, e)}
            {e.cue ? ` · ${e.cue}` : ""}
          </p>
        </div>

        {e.coachId !== null && (
          <div className="pt-slot__actions">
            <button
              type="button"
              title={B.delete}
              aria-label={B.deleteAria(e.name)}
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
            {B.kicker}
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            {B.count(exercises.length)}
          </h1>
        </div>
        <button
          type="button"
          className="pt-btn"
          onClick={() => setCreating(true)}
        >
          <IconPlus size={17} />
          {B.own}
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
          placeholder={B.search}
          style={{ maxWidth: 240 }}
        />
        <button
          type="button"
          className="pt-toggle"
          data-active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          {B.all}
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
            {muscleLabel(t, g)}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720 }}>
        {own.length > 0 && (
          <>
            <p className="pt-label" style={{ marginBottom: 8 }}>
              {B.yours}
            </p>
            <div style={{ display: "grid", gap: 6, marginBottom: 24 }}>
              {own.map((e) => (
                <Row key={e.id} e={e} />
              ))}
            </div>
          </>
        )}

        <p className="pt-label" style={{ marginBottom: 8 }}>
          {B.library}
        </p>
        {global.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              {B.noMatch}
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
