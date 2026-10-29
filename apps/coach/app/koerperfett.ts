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
 * Seit 0038 gibt es zusätzlich die Navy-Formel (Hals, Körpergröße, bei
 * Frauen Hüfte). `schaetzeKoerperfett` nimmt das Genaueste, was die
 * Werte hergeben: Navy, sonst YMCA, sonst nichts.
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

/**
 * US-Navy-Formel (Hodgdon & Beckett), metrisch.
 *
 *   Mann: 495 / (1,0324 − 0,19077·log10(Taille − Hals) + 0,15456·log10(Größe)) − 450
 *   Frau: 495 / (1,29579 − 0,35004·log10(Taille + Hüfte − Hals) + 0,22100·log10(Größe)) − 450
 *
 * Etwa ±3–4 Prozentpunkte, genauer als YMCA. Braucht Hals und Größe,
 * bei Frauen zusätzlich die Hüfte.
 */
export function koerperfettNavy(
  tailleCm: number | null,
  halsCm: number | null,
  huefteCm: number | null,
  groesseCm: number | null,
  geschlecht: FormelGeschlecht | null,
): number | null {
  if (tailleCm === null || halsCm === null || groesseCm === null || geschlecht === null) return null;
  let prozent: number;
  if (geschlecht === "male") {
    const d = tailleCm - halsCm;
    if (d <= 0) return null;
    prozent = 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(groesseCm)) - 450;
  } else {
    if (huefteCm === null) return null;
    const d = tailleCm + huefteCm - halsCm;
    if (d <= 0) return null;
    prozent = 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.221 * Math.log10(groesseCm)) - 450;
  }
  if (!Number.isFinite(prozent) || prozent < 3 || prozent > 60) return null;
  return Math.round(prozent * 10) / 10;
}

export interface KoerperfettWerte {
  tailleCm: number | null;
  halsCm: number | null;
  huefteCm: number | null;
  gewichtKg: number | null;
  groesseCm: number | null;
  geschlecht: FormelGeschlecht | null;
}

export type Schaetzung = { wert: number; methode: "navy" | "ymca" };

/** Das Genaueste, was die Werte hergeben: Navy, sonst YMCA, sonst null. */
export function schaetzeKoerperfett(w: KoerperfettWerte): Schaetzung | null {
  const navy = koerperfettNavy(w.tailleCm, w.halsCm, w.huefteCm, w.groesseCm, w.geschlecht);
  if (navy !== null) return { wert: navy, methode: "navy" };
  const ymca = koerperfettYmca(w.tailleCm, w.gewichtKg, w.geschlecht);
  if (ymca !== null) return { wert: ymca, methode: "ymca" };
  return null;
}
