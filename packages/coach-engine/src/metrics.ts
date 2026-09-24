/**
 * Kennzahlen einzelner Sätze und Muster.
 *
 * Hier steckt die Antwort auf das "1Fit-Problem": Fortschritt wird pro
 * BEWEGUNGSMUSTER geführt. Wechselt der Athlet die Übung im Slot oder trainiert
 * zwischendurch allein, bricht die Kurve nicht ab.
 */

import type {
  LoggedSet,
  MovementPattern,
  Session,
  UUID,
} from "@ptfive/types";

/**
 * Wirksame Last eines Satzes in Kilogramm.
 *
 * Bei Hantelübungen das eingetragene Gewicht. Bei Körpergewichtsübungen
 * der bewegte Körperanteil plus das, was am Gürtel hängt.
 *
 * Das ist die Zahl, die den Bruch verhindert: Ein Klimmzug bei 85 kg
 * Körpergewicht ist ein Satz mit 85 kg, mit Gürtel einer mit 105 kg —
 * eine Skala, kein Neuanfang an dem Tag, an dem jemand Gewicht anhängt.
 */
/**
 * Was zum Rechnen einer Last wirklich gebraucht wird.
 *
 * Schmaler als `LoggedSet`, und zwar aus einem konkreten Grund: Waehrend
 * des Trainings gibt es die Zeile noch nicht. Der Athlet hat Zahlen in
 * ein Feld getippt, mehr nicht — keine id, keine Satznummer, kein Slot.
 * Wuerden diese drei Funktionen auf dem vollen Satz bestehen, koennte
 * die Oberflaeche erst NACH dem Speichern sagen, was sie wert ist. Fuer
 * den Bestleistungs-Moment waere das zu spaet.
 */
export type LoadedSet = Pick<LoggedSet, "weightKg" | "bodyLoadKg" | "reps">;

export function effectiveLoad(set: LoadedSet): number {
  return (set.bodyLoadKg ?? 0) + Math.max(0, set.weightKg);
}

/**
 * Hat der Satz überhaupt eine bezifferbare Last?
 *
 * Ohne bekannten Körperanteil bleibt eine Körpergewichtsübung auf der
 * Wiederholungsskala. Das gilt für gehaltene Übungen — eine Plank hat
 * keine sinnvolle Last — und für Altdaten ohne Check-in.
 */
export function hasLoad(set: LoadedSet): boolean {
  return effectiveLoad(set) > 0;
}

/**
 * Geschätztes Einer-Maximum nach Epley.
 *
 * Ohne bezifferbare Last dienen die Wiederholungen selbst als
 * Vergleichsgröße. Die beiden Skalen sind bewusst NICHT vermischbar —
 * siehe `comparableScores`.
 */
export function estimateOneRepMax(set: LoadedSet): number {
  const load = effectiveLoad(set);
  if (load <= 0) return set.reps;
  return load * (1 + set.reps / 30);
}

/** Bester Satz einer Liste, gemessen am geschätzten 1RM. */
export function bestSet(sets: readonly LoggedSet[]): LoggedSet | undefined {
  if (sets.length === 0) return undefined;
  return sets.reduce((best, s) =>
    estimateOneRepMax(s) > estimateOneRepMax(best) ? s : best,
  );
}

/** Gesamtvolumen in Kilogramm (wirksame Last mal Wiederholungen). */
export function totalVolume(sets: readonly LoggedSet[]): number {
  return sets.reduce((sum, s) => sum + effectiveLoad(s) * s.reps, 0);
}

export interface PatternPoint {
  sessionId: UUID;
  performedAt: string;
  /** Bester geschätzter 1RM dieses Musters in dieser Einheit. */
  score: number;
  /** Womit der Bestwert erzielt wurde — das Werkzeug darf wechseln. */
  exerciseId: UUID;
  isBodyweight: boolean;
}

/**
 * Verlauf eines Musters über alle Einheiten, aufsteigend nach Datum.
 *
 * Körpergewichts- und Hantelwerte werden getrennt gehalten, weil "8
 * Klimmzüge" und "80 kg Bankdrücken" nicht auf derselben Skala liegen.
 */
export function patternHistory(
  sessions: readonly Session[],
  pattern: MovementPattern,
): PatternPoint[] {
  const points: PatternPoint[] = [];

  for (const session of sessions) {
    // Slots ohne Muster (Rumpfarbeit) fallen hier automatisch heraus:
    // null ist nie gleich einem der fünf Muster. Genau so soll es sein —
    // ein Plank hat in der Kreuzheben-Kurve nichts verloren.
    const slots = session.slots.filter((s) => s.pattern === pattern);
    if (slots.length === 0) continue;

    let top: { score: number; exerciseId: UUID; bw: boolean } | null = null;
    for (const slot of slots) {
      const best = bestSet(slot.sets);
      if (!best) continue;
      const score = estimateOneRepMax(best);
      if (!top || score > top.score) {
        top = {
          score,
          exerciseId: slot.exerciseId,
          // Die Skala hängt daran, ob der Satz eine bezifferbare Last
          // hat — nicht daran, ob Gewicht an einem Gürtel hing. Sonst
          // wechselte der Klimmzug die Skala an dem Tag, an dem jemand
          // 5 kg anhängt, und die ganze bisherige Kurve fiele weg.
          bw: !hasLoad(best),
        };
      }
    }
    if (!top) continue;

    points.push({
      sessionId: session.id,
      performedAt: session.performedAt,
      score: top.score,
      exerciseId: top.exerciseId,
      isBodyweight: top.bw,
    });
  }

  return points.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

/**
 * Nur Punkte derselben Skala vergleichen.
 *
 * Es gibt zwei: Kilogramm und Wiederholungen. Ohne diesen Filter würde
 * ein Wechsel von einer Übung ohne bezifferbare Last — Plank, oder
 * Klimmzüge bei einem Athleten ohne gemeldetes Gewicht — zu einer mit
 * Last als dramatischer Sprung erscheinen.
 *
 * Seit die Körpergewichtsübungen eine echte Last tragen, greift der
 * Filter deutlich seltener. Das ist der Sinn der Sache.
 */
export function comparableScores(points: readonly PatternPoint[]): number[] {
  if (points.length === 0) return [];
  const latest = points[points.length - 1];
  if (!latest) return [];
  return points
    .filter((p) => p.isBodyweight === latest.isBodyweight)
    .map((p) => p.score);
}

// ---------- Der Bestleistungs-Moment ----------

/**
 * Was ein Satz braucht, damit man ihn mit einer Bestleistung vergleichen
 * kann.
 *
 * Bewusst nicht der volle `LoggedSet`: Waehrend des Trainings gibt es
 * die Zeile noch gar nicht — der Athlet hat gerade erst Zahlen in ein
 * Feld getippt. Eine Funktion, die erst nach dem Speichern etwas sagen
 * kann, kommt fuer diesen Moment zu spaet.
 */
export interface AttemptSet extends LoadedSet {
  isBodyweight: boolean;
}

/** Die bisherige Bestleistung einer Uebung. */
export interface BestMark {
  /** Geschaetztes Einer-Maximum, oder eine Wiederholungszahl. */
  score: number;
  weightKg: number;
  reps: number;
  isBodyweight: boolean;
}

export interface BeatsBest {
  /** Um wie viel das geschaetzte Maximum darueber liegt. */
  deltaScore: number;
  /** Prozent, gerundet. Null, wenn es vorher nichts gab. */
  percent: number | null;
  /** true = die allererste Leistung in dieser Uebung. */
  isFirst: boolean;
}

/**
 * Schlaegt dieser Satz die bisherige Bestleistung?
 *
 * DER GANZE PUNKT IST DER ZEITPUNKT. Die Zahl steht schon heute in der
 * Oberflaeche — als Referenz daneben: „Best 100 kg x 8". Was fehlt, ist
 * der Augenblick, in dem der Athlet 105 eintraegt und es SOFORT
 * dasteht. Dafuer rechnet diese Funktion auf einem Satz, der noch nicht
 * gespeichert ist.
 *
 * ZWEI ENTSCHEIDUNGEN
 *
 * 1. **Eine Schwelle.** Gerechnet wird mit Epley, und dort schlaegt
 *    jede halbe Wiederholung durch: 100 kg x 8 sind 126,67, 100 kg x 8
 *    mit 0,1 kg mehr sind 126,79. Ohne Schwelle waere jeder zweite Satz
 *    eine „neue Bestleistung", und nach dem dritten Mal glaubt es
 *    niemand mehr. Ein Prozent ist die Grenze: Darunter ist es
 *    Messrauschen, darueber hat jemand etwas geschafft.
 *
 * 2. **Skalen werden nicht vermischt.** Ein Klimmzug ohne gemeldetes
 *    Koerpergewicht zaehlt in Wiederholungen, mit Gewicht in Kilogramm.
 *    Die beiden gegeneinander zu rechnen ergaebe aus dem Umstieg eine
 *    Bestleistung, die keine ist — dieselbe Regel wie bei den Kurven.
 */
export function beatsBest(
  attempt: AttemptSet,
  best: BestMark | null,
  mindestensProzent = 1,
): BeatsBest | null {
  if (attempt.reps <= 0) return null;

  const score = estimateOneRepMax(attempt);
  if (score <= 0) return null;

  if (!best || best.score <= 0) {
    return { deltaScore: score, percent: null, isFirst: true };
  }

  // Verschiedene Skalen: nicht vergleichbar, also keine Aussage.
  if (hasLoad(attempt) !== !best.isBodyweight) return null;

  const delta = score - best.score;
  if (delta <= 0) return null;

  const prozent = (delta / best.score) * 100;
  if (prozent < mindestensProzent) return null;

  return {
    deltaScore: Math.round(delta * 10) / 10,
    percent: Math.round(prozent),
    isFirst: false,
  };
}

/**
 * Kurzer Satz fuer die Oberflaeche.
 *
 * Nuechtern und ohne Ausrufezeichen — dieselbe Haltung wie beim
 * Volumenvergleich. Die App liefert die Zahl, die Bewertung gehoert dem
 * Trainer. Und wer nach vier Wochen Pause zurueckkommt, soll sich nicht
 * angeschrien fuehlen.
 */
export function bestLabel(b: BeatsBest): string {
  if (b.isFirst) return "Erste Leistung in dieser Übung";
  return `Neue Bestleistung · +${b.percent} %`;
}
