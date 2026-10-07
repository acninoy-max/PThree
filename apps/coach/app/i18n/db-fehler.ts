/**
 * Meldungen aus der Datenbank in die Sprache der Oberfläche.
 *
 * Die Funktionen in Postgres werfen deutsche Sätze (`raise exception`).
 * Sie dort zu übersetzen hieße, jede Funktion per Migration neu
 * einzuspielen — und die Sprache des Nutzers kennt die Datenbank nicht.
 * Also erkennen wir die Sätze hier am Anfang wieder.
 *
 * Unbekannte Meldungen werden NICHT verschluckt, sondern roh
 * durchgereicht (`unknown`). Eine deutsche Meldung ist besser als ein
 * „Fehler" ohne Inhalt — an dem niemand erkennt, was passiert ist.
 *
 * Kommt eine neue `raise exception` dazu: hier eine Zeile ergänzen.
 */
import type { Dict } from "./index";

type DbKey = Exclude<keyof Dict["fehler"]["db"], "unknown">;

const ANFAENGE: [string, DbKey][] = [
  ["Nicht angemeldet", "notSignedIn"],
  ["Dieses Konto ist ein Coach-Konto", "coachAccount"],
  ["Einladung ungueltig", "inviteInvalid"],
  ["Dieser Klient ist bereits mit einem anderen Zugang", "clientTaken"],
  ["Die Verknuepfung konnte nicht gesetzt werden", "linkFailed"],
  ["Kein Zugriff auf diesen Klienten", "noAccess"],
  ["Programm nicht gefunden", "programNotFound"],
  ["Programm wurde nicht vollstaendig", "programIncomplete"],
];

export function dbFehler(t: Dict, meldung: string): string {
  for (const [anfang, key] of ANFAENGE) {
    if (meldung.startsWith(anfang)) return t.fehler.db[key];
  }
  return t.fehler.db.unknown(meldung);
}

/**
 * Erfolgsmeldungen, die eine Funktion als Text zurückgibt (`returns
 * text`) — derzeit nur `unlink_client`. Gleiche Regel: unbekannt heißt
 * roh durchreichen.
 */
export function dbHinweis(t: Dict, satz: string): string {
  if (satz.startsWith("Dieser Klient hat noch keinen Zugang")) {
    return t.coach.actions.unlinkNone;
  }
  if (satz.startsWith("Verknuepfung geloest")) return t.coach.actions.unlinkDone;
  return satz;
}
