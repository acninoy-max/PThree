/**
 * Ist ein Bereich des Check-ins diese Woche dran?
 *
 * Seit 27.10.2026 hat jeder Bereich seinen eigenen Rhythmus — Gewicht,
 * Befinden (Energie, Schlaf, Stress) und Maße —, nicht nur die Maße
 * (Joël: „jede Woche, alle 2 Wochen … auch für Schlaf usw.").
 *
 * Gerechnet wird ab der letzten Woche, in der der Bereich tatsächlich
 * ausgefüllt wurde, nicht nach festem Kalenderraster: Wer eine Woche
 * verpasst, wird beim nächsten Mal gefragt, statt den ganzen Abstand
 * erneut abzuwarten. Die Regel stammt aus isMeasureWeek (0010).
 *
 * Reine Logik ohne Abhängigkeiten, läuft im App-Testlauf.
 */
export function bereichFaellig<T extends { weekOf: string }>(
  history: readonly T[],
  thisWeekOf: string,
  everyWeeks: number,
  ausgefuellt: (c: T) => boolean,
): boolean {
  if (everyWeeks <= 1) return true;
  const wochen = history.filter(ausgefuellt).map((c) => c.weekOf).sort();
  const letzte = wochen[wochen.length - 1];
  // Noch nie: gleich fragen.
  if (!letzte) return true;
  // Diese Woche schon ausgefüllt: Felder bleiben zum Korrigieren sichtbar.
  if (letzte === thisWeekOf) return true;
  const abstand = Math.round(
    (Date.parse(`${thisWeekOf}T00:00:00Z`) - Date.parse(`${letzte}T00:00:00Z`)) /
      (7 * 86_400_000),
  );
  return abstand >= everyWeeks;
}
