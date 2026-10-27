/**
 * Wochenziel und Serie („Streak") des Klienten.
 *
 * Meeting 27.10.2026: Der Klient soll dranbleiben, nach dem Muster von
 * Duolingo. Bewusst mit WOCHEN statt Tagen: Ruhetage gehören zum
 * Training, eine Tages-Serie bestrafte genau die. Der Klient setzt sich
 * selbst ein Ziel („4× pro Woche"), die Serie zählt die Wochen in Folge,
 * in denen er es erreicht hat.
 *
 * Gezählt werden Trainingstage, nicht Einheiten: Zwei Einheiten an einem
 * Tag sind ein Trainingstag. Sonst ließe sich das Ziel am Sonntagabend
 * mit vier kurzen Einträgen „erfüllen".
 *
 * Wochen laufen Montag bis Sonntag, Tage in Amsterdam (zone.ts) — sonst
 * fiele ein Training um 00:30 auf dem Server in den Vortag.
 *
 * Reine Logik, läuft im App-Testlauf.
 */
import { montagVon, plusTage, tagISO } from "./zone";

export interface Serie {
  ziel: number;
  /** Trainingstage in der laufenden Woche. */
  dieseWoche: number;
  /** Wochen in Folge mit erreichtem Ziel, die laufende mitgezählt, wenn schon erreicht. */
  wochen: number;
  /** Ziel diese Woche schon erreicht. */
  geschafft: boolean;
  /** Tage, die in dieser Woche noch übrig sind (heute mitgezählt). */
  tageUebrig: number;
  /**
   * Die Serie hält nur, wenn diese Woche noch trainiert wird: Es gibt
   * eine Serie, die Woche ist nicht geschafft, und die fehlenden Tage
   * passen gerade noch hinein.
   */
  knapp: boolean;
}

export function berechneSerie(
  einheiten: readonly { performedAt: string }[],
  ziel: number,
  jetzt: Date,
): Serie {
  const heute = tagISO(jetzt);
  const dieseMontag = montagVon(heute);

  // Trainingstage je Woche
  const tageJeWoche = new Map<string, Set<string>>();
  for (const e of einheiten) {
    const tag = tagISO(new Date(e.performedAt));
    const woche = montagVon(tag);
    if (!tageJeWoche.has(woche)) tageJeWoche.set(woche, new Set());
    tageJeWoche.get(woche)!.add(tag);
  }
  const anzahl = (woche: string) => tageJeWoche.get(woche)?.size ?? 0;

  const dieseWoche = anzahl(dieseMontag);
  const geschafft = dieseWoche >= ziel;

  // Rückwärts ab der Vorwoche zählen, bis eine Woche das Ziel verfehlt.
  let wochen = 0;
  let woche = plusTage(dieseMontag, -7);
  while (anzahl(woche) >= ziel) {
    wochen += 1;
    woche = plusTage(woche, -7);
  }
  // Die laufende Woche zählt, sobald sie geschafft ist. Nicht geschafft
  // heißt hier nur „noch nicht" — sie bricht die Serie nicht.
  if (geschafft) wochen += 1;

  // Montag = 7 Tage übrig, Sonntag = 1.
  const tageUebrig =
    7 - Math.round((Date.parse(`${heute}T00:00:00Z`) - Date.parse(`${dieseMontag}T00:00:00Z`)) / 86_400_000);
  const fehlen = Math.max(0, ziel - dieseWoche);
  // Heute schon trainiert? Dann zählt heute nicht mehr als freier Tag.
  const heuteSchon = tageJeWoche.get(dieseMontag)?.has(heute) ?? false;
  const freieTage = tageUebrig - (heuteSchon ? 1 : 0);
  // Knapp = jeder verbleibende Tag muss ein Trainingstag werden.
  const knapp = wochen > 0 && !geschafft && fehlen > 0 && fehlen === freieTage;

  return { ziel, dieseWoche, wochen, geschafft, tageUebrig, knapp };
}
