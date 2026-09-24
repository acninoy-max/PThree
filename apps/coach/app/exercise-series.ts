/**
 * Übungsverläufe als Diagrammreihen — für Trainer und Athlet dieselbe
 * Umrechnung.
 *
 * Aus dem Meeting 16.09: neben der Bestleistung soll auch das
 * Gesamtvolumen einer einzelnen Übung sichtbar sein. Beides beantwortet
 * eine andere Frage:
 *
 *   Bestleistung — wie stark bin ich geworden?
 *   Volumen      — wie viel Arbeit habe ich gemacht?
 *
 * Die zweite Frage ist die, an der Trainer eine Stagnation erkennen:
 * Wer dieselbe Bestleistung hält, aber pro Einheit doppelt so viel
 * bewegt, macht Fortschritte, die keine Bestleistungskurve zeigt.
 *
 * Beide Kurven dürfen nie gleichzeitig laufen. Kilogramm-Volumen liegt
 * um zwei Größenordnungen über einem Einer-Maximum; nebeneinander wäre
 * die eine Kurve eine flache Linie am Rand.
 */

import { exerciseValue, type ExerciseMetric } from "@ptfive/coach-engine";
import type { Series } from "@/app/metric-chart";

export type { ExerciseMetric };

export const METRICS: { key: ExerciseMetric; label: string }[] = [
  { key: "best", label: "Bestleistung" },
  { key: "volume", label: "Volumen" },
];

export interface CurvePoint {
  performedAt: string;
  /** Geschätztes Einer-Maximum, oder eine Wiederholungszahl. */
  score: number;
  /** Wirksame Last mal Wiederholungen an diesem Tag. */
  volumeKg: number;
  /** Wiederholungen an diesem Tag. */
  reps: number;
  isRepsOnly: boolean;
}

export interface CurveLike {
  id: string;
  name: string;
  points: CurvePoint[];
}

/**
 * Reihen für das Diagramm.
 *
 * Im Volumenmodus bekommen Übungen ohne bezifferbare Last ihre
 * Wiederholungen statt einer Kilogrammzahl. 3 × 20 Liegestütze sind 60
 * Wiederholungen — `volumeKg` wäre dort null, und eine Kurve auf der
 * Nulllinie behauptet, es sei nichts passiert.
 *
 * Das geht nur, weil jede Reihe im Diagramm auf ihre EIGENE Spanne
 * skaliert wird und ihre Einheit am Chip trägt. Zwei Maßstäbe in einer
 * Linie wären ein Fehler; zwei Maßstäbe in zwei Linien sind zwei
 * Aussagen.
 */
export function exerciseSeries(
  curves: readonly CurveLike[],
  metric: ExerciseMetric,
  colors: readonly string[],
): Series[] {
  return curves.map((c, i) => {
    // Ohne bezifferbare Last sind beide Kurven Wiederholungen: die
    // Bestleistung ist dann der beste Satz in Wiederholungen, das
    // Volumen die Summe aller Wiederholungen.
    const repsOnly = c.points[0]?.isRepsOnly ?? false;
    const unit = repsOnly ? "Wdh." : "kg";

    return {
      key: c.id,
      label: c.name,
      unit,
      color: colors[i % colors.length]!,
      points: c.points.map((p) => ({
        on: p.performedAt.slice(0, 10),
        // Die Umrechnung steht in der Engine, damit Diagramm und
        // Zusammenfassung darunter nie verschiedene Zahlen zeigen.
        value: Math.round(exerciseValue(p, metric)),
      })),
    };
  });
}

/** Was unter der Kurve steht, je nach Modus. */
export function metricHint(metric: ExerciseMetric): string {
  return metric === "best"
    ? "Bester Satz je Einheit, umgerechnet auf ein Einer-Maximum."
    : "Alle Sätze je Einheit zusammen — Last mal Wiederholungen. Übungen ohne bezifferbare Last zählen in Wiederholungen.";
}
