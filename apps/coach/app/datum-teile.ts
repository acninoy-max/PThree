/**
 * Geburtsdatum aus drei Auswahlfeldern.
 *
 * Warum nicht `input[type="date"]`: Am Rechner öffnet Chrome dafür
 * einen Monatskalender, der beim heutigen Datum steht. Wer 1988
 * eintragen will, klickt sich 450 Monate zurück oder findet das kleine
 * Jahresmenü nicht (Test 15.10.2026). Drei Auswahlfelder gehen am
 * Rechner und am Handy gleich schnell.
 *
 * Reine Logik ohne React, damit sie im App-Testlauf läuft.
 */

export interface DatumTeile {
  tag: string;
  monat: string;
  jahr: string;
}

export const LEER: DatumTeile = { tag: "", monat: "", jahr: "" };

/** "1988-03-07" → { tag: "7", monat: "3", jahr: "1988" }; alles andere → leer. */
export function zerlegeDatum(iso: string | null | undefined): DatumTeile {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return LEER;
  return { jahr: m[1]!, monat: String(Number(m[2])), tag: String(Number(m[3])) };
}

export function tageImMonat(jahr: number, monat: number): number {
  // Tag 0 des Folgemonats = letzter Tag dieses Monats. UTC, damit keine
  // Zeitzone dazwischenfunkt (vgl. plan-week.ts, 09.09.).
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

/**
 * Setzt die Teile zu "JJJJ-MM-TT" zusammen.
 *
 * "" heißt: kein Datum (alle drei leer). null heißt: unvollständig oder
 * unmöglich — der Aufrufer schickt dann nichts Halbes an den Server.
 * Ein 31. in einem kurzen Monat wird nicht still auf den 30. gezogen,
 * sondern gilt als unmöglich; sonst stünde ein Datum in der Akte, das
 * niemand eingegeben hat.
 */
export function setzeDatum(t: DatumTeile): string | null {
  if (!t.tag && !t.monat && !t.jahr) return "";
  const tag = Number(t.tag);
  const monat = Number(t.monat);
  const jahr = Number(t.jahr);
  if (!Number.isInteger(tag) || !Number.isInteger(monat) || !Number.isInteger(jahr)) return null;
  if (!t.tag || !t.monat || !t.jahr) return null;
  if (monat < 1 || monat > 12 || tag < 1 || tag > tageImMonat(jahr, monat)) return null;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/** Wählbare Jahre, neuestes zuerst: von `bis` zurück bis `bis - 100`. */
export function jahre(bis: number): number[] {
  return Array.from({ length: 101 }, (_, i) => bis - i);
}
