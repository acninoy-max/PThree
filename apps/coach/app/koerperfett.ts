/**
 * Körperfettanteil aus Taille und Gewicht (YMCA-Formel).
 *
 * Meeting 29.10.2026: Joël misst nur mit dem Maßband und will trotzdem
 * einen Körperfettwert sehen. Die übliche Maßband-Formel (US Navy)
 * braucht den Halsumfang, den es hier nicht gibt. Die YMCA-Formel kommt
 * mit dem aus, was ohnehin erhoben wird: Taillenumfang und Gewicht. Sie
 * unterscheidet nach Mann und Frau.
 *
 *   KF % = (−98,42 [Frau: −76,76] + 4,15 × Taille[in] − 0,082 × Gewicht[lb])
 *          / Gewicht[lb] × 100
 *
 * Eine Schätzung (etwa ±4–5 Prozentpunkte), keine Messung. Sie taugt für
 * den Verlauf desselben Menschen, weniger für den Vergleich zwischen
 * Menschen. Deshalb heißt sie in der Oberfläche „geschätzt".
 *
 * Unplausible Ergebnisse (unter 3 % oder über 60 %) gibt es nicht als
 * Zahl, sondern als null — meist ein Tippfehler bei Taille oder Gewicht.
 *
 * Reine Logik, läuft im App-Testlauf.
 */

export type FormelGeschlecht = "male" | "female";

const CM_JE_INCH = 2.54;
const LB_JE_KG = 2.2046226218;

export function koerperfettYmca(
  tailleCm: number | null,
  gewichtKg: number | null,
  geschlecht: FormelGeschlecht | null,
): number | null {
  if (tailleCm === null || gewichtKg === null || geschlecht === null) return null;
  if (tailleCm <= 0 || gewichtKg <= 0) return null;
  const tailleIn = tailleCm / CM_JE_INCH;
  const gewichtLb = gewichtKg * LB_JE_KG;
  const konstante = geschlecht === "male" ? -98.42 : -76.76;
  const prozent = ((konstante + 4.15 * tailleIn - 0.082 * gewichtLb) / gewichtLb) * 100;
  if (!Number.isFinite(prozent) || prozent < 3 || prozent > 60) return null;
  return Math.round(prozent * 10) / 10;
}
