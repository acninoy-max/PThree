/**
 * Was beim letzten Mal in jedem Satz stand — je Übung.
 *
 * WARUM
 * -----
 * Bis 27.10.2026 schlug „Last time" den schwersten Satz der letzten
 * Einheit vor, und zwar für alle Sätze. Wer sich hocharbeitet (Satz 1
 * 40 kg, Satz 2 60 kg, Satz 3 80 kg), bekam überall 80 kg vorgeschlagen.
 * Joël: Das Gewicht soll genau das sein, was im ersten, zweiten, dritten
 * Satz stand.
 *
 * Jetzt bleibt die Reihenfolge erhalten: Satz 1 bekommt, was letztes Mal
 * Satz 1 war. Die Werte stehen als grauer Platzhalter im Feld, und
 * „übernehmen" schreibt sie Satz für Satz hinein.
 *
 * Reine Logik ohne React, läuft im App-Testlauf.
 */

export interface VorherSatz {
  weightKg: number;
  reps: number;
  isBodyweight: boolean;
}

export interface LetztesMal {
  /** Zeitpunkt der Einheit (ISO). */
  on: string;
  sets: VorherSatz[];
}

interface SitzungsAuszug {
  performedAt: string;
  slots: { exerciseId: string; sets: VorherSatz[] }[];
}

/**
 * Je Übung die Sätze der jüngsten Einheit, in der sie vorkam.
 *
 * Sortiert selbst nach Zeitpunkt, statt sich auf die Reihenfolge der
 * Abfrage zu verlassen. Kommt eine Übung in einer Einheit zweimal vor
 * (zwei Slots), zählen beide hintereinander — so wurden sie gemacht.
 */
export function letzteSaetze(sessions: readonly SitzungsAuszug[]): Record<string, LetztesMal> {
  const out: Record<string, LetztesMal> = {};
  const sortiert = [...sessions].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  for (const s of sortiert) {
    const dieseEinheit: Record<string, VorherSatz[]> = {};
    for (const slot of s.slots) {
      const saetze = slot.sets.filter((x) => x.reps > 0);
      if (saetze.length === 0) continue;
      (dieseEinheit[slot.exerciseId] ??= []).push(
        ...saetze.map((x) => ({ weightKg: x.weightKg, reps: x.reps, isBodyweight: x.isBodyweight })),
      );
    }
    for (const [id, sets] of Object.entries(dieseEinheit)) {
      out[id] = { on: s.performedAt, sets };
    }
  }
  return out;
}

/**
 * Der Vorher-Satz für Satz i.
 *
 * Heute mehr Sätze als letztes Mal: Für die zusätzlichen gilt der letzte
 * Satz von damals — der nächstliegende Anhaltspunkt, kein erfundener.
 */
export function vorherFuer(l: LetztesMal | undefined, i: number): VorherSatz | null {
  if (!l || l.sets.length === 0) return null;
  return l.sets[Math.min(i, l.sets.length - 1)] ?? null;
}
