/**
 * Volumen einer Einheit und der Vergleich gleicher Trainingstage.
 *
 * Aus dem Meeting: „Gesamtvolumen-Vergleich der gleichen Trainingstage wär
 * cool." Der Vergleich ist nur dann etwas wert, wenn er gleiches mit
 * gleichem vergleicht — deshalb je Plantag und nicht über alles.
 *
 * Gerechnet wird mit der WIRKSAMEN Last: Körpergewichtsanteil plus
 * Zusatzgewicht. Ein Klimmzug bei 85 kg ist damit ein Satz mit 85 kg und
 * kein Nullbeitrag — 3 × 8 sind 2.040 kg.
 *
 * Sätze ohne bezifferbare Last bleiben getrennt: gehaltene Übungen wie
 * die Plank, und Körpergewichtssätze von Athleten, die ihr Gewicht nie
 * gemeldet haben. Für die gibt es keine ehrliche Kilogrammzahl, also
 * werden sie nach Sätzen und Wiederholungen ausgewiesen statt geraten.
 */

import type { Session, UUID } from "@ptfive/types";
import { effectiveLoad, hasLoad } from "./metrics";

export interface VolumePoint {
  sessionId: UUID;
  performedAt: string;
  /** Plantag, falls die Einheit einem folgte. */
  planDayId: UUID | null;
  title: string;
  /** Wirksame Last mal Wiederholungen, über alle bezifferbaren Sätze. */
  volumeKg: number;
  /** Sätze mit bezifferbarer Last. */
  workingSets: number;
  /** Sätze ohne bezifferbare Last — getrennt gezählt, siehe oben. */
  bodyweightSets: number;
  /** Wiederholungen aus den Sätzen ohne bezifferbare Last. */
  bodyweightReps: number;
}

/**
 * Ein Satz zählt ins Kilogramm-Volumen, sobald seine Last beziffert ist.
 *
 * Seit dem Körpergewichtsfaktor gilt das auch für Klimmzüge: 3 × 8 bei
 * 85 kg sind 2.040 kg und nicht null. Ohne bekanntes Körpergewicht — oder
 * bei gehaltenen Übungen wie der Plank — bleibt es bei der getrennten
 * Zählung nach Sätzen und Wiederholungen.
 */

/** Volumen und Satzzahlen einer einzelnen Einheit. */
export function sessionVolume(session: Session): VolumePoint {
  let volumeKg = 0;
  let workingSets = 0;
  let bodyweightSets = 0;
  let bodyweightReps = 0;

  for (const slot of session.slots) {
    for (const set of slot.sets) {
      if (set.reps <= 0) continue;
      if (hasLoad(set)) {
        volumeKg += effectiveLoad(set) * set.reps;
        workingSets += 1;
      } else {
        bodyweightSets += 1;
        bodyweightReps += set.reps;
      }
    }
  }

  return {
    sessionId: session.id,
    performedAt: session.performedAt,
    planDayId: session.planDayId,
    title: session.title,
    volumeKg,
    workingSets,
    bodyweightSets,
    bodyweightReps,
  };
}

/**
 * Verlauf eines Trainingstags, älteste Einheit zuerst.
 *
 * Nur Einheiten, die diesem Plantag folgten. Freies Training hat keinen
 * Plantag und bleibt draußen — es gegen „Oberkörper" zu stellen, hiesse
 * Äpfel mit Birnen zu vergleichen.
 */
export function dayVolumeHistory(
  sessions: readonly Session[],
  planDayId: UUID,
): VolumePoint[] {
  return sessions
    .filter((s) => s.planDayId === planDayId)
    .map(sessionVolume)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

/** Alle Trainingstage, für die es mindestens eine Einheit gibt. */
export function volumeByDay(
  sessions: readonly Session[],
): Map<UUID, VolumePoint[]> {
  const out = new Map<UUID, VolumePoint[]>();
  for (const session of sessions) {
    if (session.planDayId === null) continue;
    const list = out.get(session.planDayId) ?? [];
    list.push(sessionVolume(session));
    out.set(session.planDayId, list);
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  }
  return out;
}

export interface VolumeChange {
  /** Die Einheit, um die es geht. */
  current: VolumePoint;
  /** Die vorherige Einheit desselben Trainingstags, falls es eine gibt. */
  previous: VolumePoint | null;
  /** Unterschied in Kilogramm. Positiv = mehr. */
  deltaKg: number;
  /**
   * Unterschied in Prozent, gerundet. null, wenn es nichts zu vergleichen
   * gibt — beim ersten Mal oder wenn vorher kein Gewicht bewegt wurde.
   * Eine Steigerung „von 0 auf irgendwas" ist keine Prozentzahl, sondern
   * ein Anfang.
   */
  percent: number | null;
}

/**
 * Vergleich einer Einheit mit der vorherigen desselben Trainingstags.
 *
 * `sessions` darf alles enthalten; gefiltert wird hier.
 */
export function compareToPrevious(
  sessions: readonly Session[],
  sessionId: UUID,
): VolumeChange | null {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;

  const current = sessionVolume(session);

  if (session.planDayId === null) {
    return { current, previous: null, deltaKg: 0, percent: null };
  }

  const verlauf = dayVolumeHistory(sessions, session.planDayId);
  const i = verlauf.findIndex((p) => p.sessionId === sessionId);
  const previous = i > 0 ? (verlauf[i - 1] ?? null) : null;

  if (!previous) return { current, previous: null, deltaKg: 0, percent: null };

  const deltaKg = current.volumeKg - previous.volumeKg;
  const percent =
    previous.volumeKg > 0
      ? Math.round((deltaKg / previous.volumeKg) * 100)
      : null;

  return { current, previous, deltaKg, percent };
}

// Saetze und Zahlenformate zu VolumeChange stehen in der App
// (i18n/*/engine.ts, format.ts) — je Sprache.
