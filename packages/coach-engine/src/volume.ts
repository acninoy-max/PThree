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

/**
 * Kurzer Satz für die Oberfläche.
 *
 * Bewusst nüchtern: „8 % mehr als letztes Mal" und nicht „stark!". Die
 * Bewertung gehört dem Trainer, die App liefert die Zahl. Und ein
 * schlechter Tag — krank, müde, schlecht geschlafen — soll sich nicht
 * anfühlen, als hätte die App etwas dazu zu sagen.
 */
export function volumeChangeLabel(change: VolumeChange): string {
  const { current, previous, deltaKg, percent } = change;

  if (!previous) {
    return current.volumeKg > 0
      ? "Erstes Mal an diesem Tag — das ist deine Marke."
      : "Erstes Mal an diesem Tag.";
  }
  if (percent === null) return "Vorher ohne Gewicht — kein Vergleich möglich.";
  if (percent === 0) return "Genauso viel wie letztes Mal.";

  const kg = Math.abs(Math.round(deltaKg)).toLocaleString("de-DE");
  return percent > 0
    ? `${percent} % mehr als letztes Mal (+${kg} kg)`
    : `${Math.abs(percent)} % weniger als letztes Mal (−${kg} kg)`;
}

/** „12.400 kg" — einheitlich in beiden Apps. */
export function volumeLabel(kg: number): string {
  return `${Math.round(kg).toLocaleString("de-DE")} kg`;
}

/**
 * Veränderung als Text: „−15 kg", „+2,5 kg", „±0 kg".
 *
 * Aus dem Meeting 16.09: „Bei dem Gewichtsverlust muss irgendwo
 * gehighlighted werden, z. B. −15 kg."
 *
 * Drei Entscheidungen stecken darin:
 *
 * 1. Das Minus ist U+2212, nicht der Bindestrich. Auf einer Ziffernzeile
 *    sitzt der Bindestrich zu hoch und zu kurz — „-15" liest sich wie
 *    ein Trennstrich, „−15" sofort als negativ.
 *
 * 2. Eine Nachkommastelle nur, wo sie etwas sagt. Bei Gewicht und Maßen
 *    ist „−1,5 kg" eine andere Aussage als „−2 kg". Ab 100 aufwärts —
 *    und Volumen bewegt sich in Tausendern — ist sie Rauschen.
 *
 * 3. Kein Vorzeichen-Wort, keine Bewertung. −15 kg auf der Waage ist ein
 *    Erfolg, −15 kg beim Bankdrücken das Gegenteil. Die Funktion weiß
 *    nicht, was gemessen wird, und tut deshalb nicht so.
 */
export function deltaLabel(delta: number, unit: string): string {
  const grob = Math.abs(delta) >= 100;
  const gerundet = grob ? Math.round(delta) : Math.round(delta * 10) / 10;

  // Nach dem Runden, nicht davor: −0,04 kg ist keine Veränderung, die
  // man „−0,04" nennen sollte, und „−0 kg" wäre schlicht falsch.
  if (gerundet === 0) return `±0 ${unit}`;

  const betrag = Math.abs(gerundet);
  const zahl = grob
    ? betrag.toLocaleString("de-DE")
    : betrag
        .toFixed(1)
        .replace(".", ",")
        // „2,0 kg" schreibt niemand.
        .replace(/,0$/, "");

  return `${gerundet > 0 ? "+" : "−"}${zahl} ${unit}`;
}
