/**
 * Verlauf pro Übung.
 *
 * Aus dem Meeting: Der Athlet will „mein Bankdrücken" sehen, nicht „mein
 * Drücken". Die Musterkurve beantwortet eine andere Frage — sie hält die
 * Historie zusammen, wenn das Werkzeug wechselt. Beides hat seine
 * Berechtigung, aber die Frage des Athleten ist die hier.
 *
 * Gerechnet wird mit der wirksamen Last, also inklusive Körperanteil. Ein
 * Klimmzug taucht damit als echte Kurve auf und nicht als Zahlenreihe aus
 * Wiederholungen.
 */

import type { Session, UUID } from "@ptfive/types";
import { bestSet, effectiveLoad, estimateOneRepMax, hasLoad } from "./metrics";

export interface ExercisePoint {
  sessionId: UUID;
  performedAt: string;
  /** Geschätztes Einer-Maximum des besten Satzes. */
  score: number;
  /** Beste Kombination des Tages — für die Beschriftung. */
  bestWeightKg: number;
  bestReps: number;
  /** Bewegter Körperanteil des besten Satzes, falls bekannt. */
  bestBodyLoadKg: number | null;
  /** Summe aus wirksamer Last mal Wiederholungen an diesem Tag. */
  volumeKg: number;
  /**
   * Wiederholungen an diesem Tag, über alle Sätze.
   *
   * Für Übungen ohne bezifferbare Last ist DAS das Volumen: 3 × 20
   * Liegestütze sind 60 Wiederholungen. `volumeKg` wäre dort null und
   * die Kurve eine Linie auf der Achse — was nicht heisst, dass nichts
   * passiert ist.
   */
  reps: number;
  sets: number;
  /**
   * true = ohne bezifferbare Last, der Wert ist dann eine
   * Wiederholungszahl. Punkte beider Arten dürfen nicht in einer Linie
   * stehen — siehe `comparableExercisePoints`.
   */
  isRepsOnly: boolean;
}

export interface LoggedExercise {
  exerciseId: UUID;
  /** Wie oft die Übung insgesamt vorkam. */
  sets: number;
  sessions: number;
  /** Letzte Einheit, in der sie vorkam. */
  lastPerformedAt: string;
}

/**
 * Jede Übung, die der Athlet je geloggt hat — mit Häufigkeit.
 *
 * Bewusst ohne Untergrenze: Auch die Übung, die vor einem halben Jahr
 * einmal vorkam, muss auswählbar sein. Sortiert nach Sätzen, damit die
 * Voreinstellung und die Auswahlliste dieselbe Reihenfolge haben.
 */
export function loggedExercises(
  sessions: readonly Session[],
): LoggedExercise[] {
  const acc = new Map<UUID, LoggedExercise>();

  for (const session of sessions) {
    const gesehen = new Set<UUID>();
    for (const slot of session.slots) {
      const gezaehlt = slot.sets.filter((s) => s.reps > 0).length;
      if (gezaehlt === 0) continue;

      const eintrag = acc.get(slot.exerciseId) ?? {
        exerciseId: slot.exerciseId,
        sets: 0,
        sessions: 0,
        lastPerformedAt: session.performedAt,
      };
      eintrag.sets += gezaehlt;
      if (!gesehen.has(slot.exerciseId)) {
        eintrag.sessions += 1;
        gesehen.add(slot.exerciseId);
      }
      if (session.performedAt > eintrag.lastPerformedAt) {
        eintrag.lastPerformedAt = session.performedAt;
      }
      acc.set(slot.exerciseId, eintrag);
    }
  }

  return [...acc.values()].sort(
    (a, b) => b.sets - a.sets || b.lastPerformedAt.localeCompare(a.lastPerformedAt),
  );
}

/**
 * Verlauf einer Übung, älteste Einheit zuerst.
 *
 * Ein Punkt je Einheit: der beste Satz. Nicht der Durchschnitt — der
 * fällt, sobald jemand einen Abfallsatz anhängt, und das ist kein
 * Rückschritt.
 */
export function exerciseHistory(
  sessions: readonly Session[],
  exerciseId: UUID,
): ExercisePoint[] {
  const points: ExercisePoint[] = [];

  for (const session of sessions) {
    const slots = session.slots.filter((s) => s.exerciseId === exerciseId);
    if (slots.length === 0) continue;

    const alle = slots.flatMap((s) => s.sets).filter((s) => s.reps > 0);
    if (alle.length === 0) continue;

    const best = bestSet(alle);
    if (!best) continue;

    points.push({
      sessionId: session.id,
      performedAt: session.performedAt,
      score: estimateOneRepMax(best),
      bestWeightKg: best.weightKg,
      bestReps: best.reps,
      bestBodyLoadKg: best.bodyLoadKg,
      volumeKg: alle.reduce((n, s) => n + effectiveLoad(s) * s.reps, 0),
      reps: alle.reduce((n, s) => n + s.reps, 0),
      sets: alle.length,
      isRepsOnly: !hasLoad(best),
    });
  }

  return points.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

/**
 * Nur Punkte derselben Skala.
 *
 * Dieselbe Regel wie bei den Mustern: Kilogramm und Wiederholungen sind
 * zwei Maßstäbe. Meldet ein Athlet ab einem bestimmten Tag sein Gewicht,
 * bekommen seine Klimmzüge rückwirkend eine Last — die Punkte davor
 * bleiben Wiederholungen und gehören nicht in dieselbe Linie.
 */
export function comparableExercisePoints<T extends { isRepsOnly: boolean }>(
  points: readonly T[],
): T[] {
  if (points.length === 0) return [];
  const letzter = points[points.length - 1];
  if (!letzter) return [];
  return points.filter((p) => p.isRepsOnly === letzter.isRepsOnly);
}

/**
 * Voreinstellung für den ersten Besuch.
 *
 * Ohne sie startet die Seite leer, und eine leere Seite erklärt sich
 * nicht. Genommen werden die häufigsten Übungen — was jemand oft macht,
 * interessiert ihn am ehesten.
 */
export function defaultExerciseSelection(
  sessions: readonly Session[],
  max = 4,
): UUID[] {
  return loggedExercises(sessions)
    .slice(0, max)
    .map((e) => e.exerciseId);
}

/** Veränderung in Prozent über den vergleichbaren Teil des Verlaufs. */
export function exerciseTrend(points: readonly ExercisePoint[]): number | null {
  const rein = comparableExercisePoints(points);
  if (rein.length < 2) return null;
  const erster = rein[0]!.score;
  const letzter = rein[rein.length - 1]!.score;
  if (erster <= 0) return null;
  return Math.round(((letzter - erster) / erster) * 100);
}

/** Welche Zahl einer Übung betrachtet wird. */
export type ExerciseMetric = "best" | "volume";

/**
 * Was für die Auswertung einer Kurve wirklich gebraucht wird.
 *
 * Die Oberfläche reicht ihre Punkte über die Server-Grenze und trägt
 * dabei nur das mit, was sie zeichnet — Satz-IDs und Bestwerte bleiben
 * auf dem Server. Diese Funktionen auf den vollen `ExercisePoint`
 * festzulegen, würde sie dort unbrauchbar machen, obwohl sie die
 * fehlenden Felder nie anfassen.
 */
export type ExerciseValuePoint = Pick<
  ExercisePoint,
  "score" | "volumeKg" | "reps" | "isRepsOnly"
>;

/**
 * Der Wert eines Punktes im gewählten Modus.
 *
 * Ohne bezifferbare Last ist das Volumen die Summe der Wiederholungen:
 * 3 × 20 Liegestütze sind 60. `volumeKg` wäre null, und eine Kurve auf
 * der Nulllinie behauptet, es sei nichts passiert.
 */
export function exerciseValue(
  point: ExerciseValuePoint,
  metric: ExerciseMetric,
): number {
  if (metric === "best") return point.score;
  return point.isRepsOnly ? point.reps : point.volumeKg;
}

export interface ExerciseChange {
  /** Absolute Veränderung über den vergleichbaren Verlauf. */
  delta: number;
  /** Dieselbe Veränderung in Prozent, oder null ohne Bezugswert. */
  percent: number | null;
  /** Der aktuelle Wert im gewählten Modus. */
  latest: number;
  /** "kg" oder "Wdh." — hängt an der Übung, nicht am Modus. */
  unit: string;
}

/**
 * Veränderung einer Übung, im gewählten Modus.
 *
 * Nur über den vergleichbaren Teil des Verlaufs: Wer erst ab einem
 * bestimmten Tag sein Körpergewicht meldet, bekommt für seine Klimmzüge
 * rückwirkend eine Last. Die Punkte davor sind Wiederholungen und dürfen
 * nicht in dieselbe Differenz.
 */
export function exerciseChange(
  points: readonly ExerciseValuePoint[],
  metric: ExerciseMetric,
): ExerciseChange | null {
  const rein = comparableExercisePoints(points);
  const letzterPunkt = rein[rein.length - 1];
  if (!letzterPunkt) return null;

  const unit = letzterPunkt.isRepsOnly ? "Wdh." : "kg";
  const latest = exerciseValue(letzterPunkt, metric);

  if (rein.length < 2) {
    return { delta: 0, percent: null, latest, unit };
  }

  const erster = exerciseValue(rein[0]!, metric);
  const delta = latest - erster;

  return {
    delta,
    // Von null auf irgendwas ist keine Prozentzahl, sondern ein Anfang.
    percent: erster > 0 ? Math.round((delta / erster) * 100) : null,
    latest,
    unit,
  };
}
