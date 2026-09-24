import Link from "next/link";
import type { Insight } from "@ptfive/coach-engine";
import { CountUp } from "@/app/count-up";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABEL,
  type MovementPattern,
  type MuscleGroup,
} from "@ptfive/types";

export const PATTERN_LABEL: Record<MovementPattern, string> = {
  push: "Oberkörper drücken",
  pull: "Oberkörper ziehen",
  squat: "Unterkörper drücken",
  hinge: "Hüftbeuge",
  overhead: "Über Kopf drücken",
};

/**
 * Beschriftung eines Musters. Rumpfarbeit hat keins — sie läuft bewusst
 * ohne Musterkurve, damit ein Plank die Kreuzheben-Zahlen nicht verwässert.
 */
export function patternLabel(pattern: MovementPattern | null): string {
  return pattern ? PATTERN_LABEL[pattern] : "Rumpf";
}

/* ---------- Muskelgruppen ----------

   Was in der Oberfläche steht. Das Bewegungsmuster bleibt darunter — es
   hält den Slot zusammen, wenn die Übung getauscht wird —, aber der
   Trainer bekommt es nicht mehr zu Gesicht. Er denkt in Muskelgruppen,
   und die App soll seine Sprache sprechen, nicht ihre eigene. */

export const MUSCLE_CHOICES = MUSCLE_GROUPS;

/**
 * Gehört die Übung in diese Gruppe — Haupt- oder Nebengruppe?
 *
 * Die eine Stelle, an der das entschieden wird. Sonst filtert die
 * Übungsauswahl anders als die Bibliothek, und der Trainer findet eine
 * Übung an einer Stelle, an der anderen nicht.
 */
export function inGroup(
  exercise: { muscleGroup: MuscleGroup; secondaryMuscleGroups: MuscleGroup[] },
  group: MuscleGroup,
): boolean {
  return (
    exercise.muscleGroup === group ||
    exercise.secondaryMuscleGroups.includes(group)
  );
}

/** „Brust" oder „Brust · auch Trizeps" — für die Zeile unter dem Namen. */
export function muscleSummary(exercise: {
  muscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
}): string {
  const haupt = muscleLabel(exercise.muscleGroup);
  if (exercise.secondaryMuscleGroups.length === 0) return haupt;
  return `${haupt} · auch ${exercise.secondaryMuscleGroups
    .map((g) => muscleLabel(g))
    .join(", ")}`;
}

export function muscleLabel(group: MuscleGroup | null): string {
  return group ? MUSCLE_GROUP_LABEL[group] : "offen";
}

/**
 * Das Muster, mit dem ein Slot verbucht wird, wenn noch keine Übung
 * gewählt ist.
 *
 * Ein grober Rückfall und bewusst keine Wahrheit: Sobald eine Übung im
 * Slot steht, gilt deren Muster — die Übung weiss es genauer als die
 * Gruppe. Für einen leeren Slot braucht es trotzdem einen Wert, sonst
 * fehlte die Kurve, bis jemand eine Übung einträgt.
 */
export function patternForGroup(group: MuscleGroup): MovementPattern | null {
  switch (group) {
    case "chest":
    case "triceps":
      return "push";
    case "back":
    case "biceps":
      return "pull";
    case "shoulders":
      return "overhead";
    case "quads":
    case "calves":
      return "squat";
    case "hamstrings":
    case "glutes":
      return "hinge";
    case "core":
      return null;
  }
}

/** Auswahl in der Oberfläche: die fünf Muster plus Rumpf. */
export type PatternChoice = MovementPattern | "core";

export function choiceToPattern(choice: PatternChoice): MovementPattern | null {
  return choice === "core" ? null : choice;
}

export function patternToChoice(
  pattern: MovementPattern | null,
): PatternChoice {
  return pattern ?? "core";
}

export const PATTERN_CHOICES: readonly PatternChoice[] = [
  "push",
  "pull",
  "squat",
  "hinge",
  "overhead",
  "core",
] as const;

export function choiceLabel(choice: PatternChoice): string {
  return choice === "core" ? "Rumpf" : PATTERN_LABEL[choice];
}

/**
 * Supersatz-Codes wie A1, A2, B1 — die Schreibweise, in der PTs
 * Programme notieren. Gleicher Buchstabe heißt: ohne Pause dazwischen.
 *
 * Slots ohne Gruppe bekommen keinen Code. Eine automatisch vergebene
 * Nummer wäre irreführend: Sie würde eine Zusammengehörigkeit behaupten,
 * die der Coach nicht gemeint hat.
 */
export function supersetCodes(
  slots: readonly { id: string; supersetGroup: string | null }[],
): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const slot of slots) {
    const g = slot.supersetGroup;
    if (!g) continue;
    const n = (seen.get(g) ?? 0) + 1;
    seen.set(g, n);
    out.set(slot.id, `${g}${n}`);
  }
  return out;
}

/** Pausenzeit in Alltagssprache: 90 → „1:30 min", 60 → „1 min". */
export function restLabel(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, "0")} min`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#f1efe9",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.36,
        fontWeight: 600,
        color: "var(--pt-text-dim)",
        flex: "none",
      }}
    >
      {initials(name)}
    </div>
  );
}

const SEVERITY_STYLE: Record<
  Insight["severity"],
  { bar: string; chipBg: string; chipFg: string }
> = {
  flag: { bar: "var(--pt-action)", chipBg: "#fbefea", chipFg: "#c42d1a" },
  nudge: { bar: "#8c877a", chipBg: "#f1efe9", chipFg: "#6e6a60" },
  info: { bar: "var(--pt-border)", chipBg: "#eff3ec", chipFg: "#3b6d11" },
};

const KIND_LABEL: Record<Insight["kind"], string> = {
  plateau: "Plateau",
  inactive: "Inaktiv",
  progress: "Fortschritt",
};

export function InsightCard({
  insight,
  clientName,
}: {
  insight: Insight;
  clientName: string;
}) {
  const s = SEVERITY_STYLE[insight.severity];
  return (
    <div
      style={{
        display: "flex",
        background: "var(--pt-surface)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      <div style={{ width: 4, background: s.bar, flex: "none" }} />
      <div style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <Avatar name={clientName} size={26} />
          <Link
            href={`/coach/clients/${insight.clientId}`}
            style={{ fontWeight: 500, color: "var(--pt-text)" }}
          >
            {clientName}
          </Link>
          <span
            style={{
              marginLeft: "auto",
              background: s.chipBg,
              color: s.chipFg,
              fontSize: "var(--pt-fs-xs)",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 999,
            }}
          >
            {KIND_LABEL[insight.kind]}
          </span>
        </div>
        <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.35 }}>
          {insight.title}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.5,
          }}
        >
          {insight.body}
        </p>
        {insight.action && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-action)",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            → {insight.action}
          </p>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  hint,
}: {
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="pt-card pt-card--empty">
      <p style={{ margin: 0, fontWeight: 500, fontSize: "var(--pt-fs-lg)" }}>{title}</p>
      <p
        style={{ margin: "6px 0 0", color: "var(--pt-text-dim)", fontSize: "var(--pt-fs-md)" }}
      >
        {body}
      </p>
      {hint && (
        <p
          style={{
            margin: "14px 0 0",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            background: "#f7f5f1",
            padding: "10px 12px",
            borderRadius: 6,
            display: "inline-block",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="pt-card pt-card--stat">
      <p className="pt-label" style={{ margin: 0 }}>
        {label}
      </p>
      {/* Die Zahl laeuft beim Erscheinen hoch — aber nur, wenn sie
          gross genug ist, dass man es sieht. Von 0 auf 3 zu zaehlen
          saehe aus wie ein Fehler; das entscheidet CountUp selbst. */}
      <p style={{ margin: "4px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
        {typeof value === "number" ? (
          <CountUp value={value} />
        ) : (
          value
        )}
      </p>
    </div>
  );
}
