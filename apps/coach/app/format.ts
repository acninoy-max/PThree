/**
 * Datums- und Zeitformate — selbst gebaut statt über `Intl`.
 *
 * Der Grund ist ein Fehler, der nur auf dem Handy auftrat:
 *
 *   Text content did not match.
 *   Server: " · abgeschickt Mi., 13:45"
 *   Client: " · abgeschickt Mi. 13:45"
 *
 * `Intl.DateTimeFormat` benutzt die ICU-Bibliothek der jeweiligen
 * Laufzeit. Node setzt zwischen Wochentag und Uhrzeit ein Komma, die
 * Fassung im mobilen Safari nicht. Der Server erzeugt das HTML, der
 * Browser rendert beim Hydrieren dasselbe noch einmal — und stellt fest,
 * dass der Text abweicht.
 *
 * Dasselbe droht bei jeder Abkürzung: „Sept." gegen „Sep.", „März" gegen
 * „Mär.". Es ist also keine Einzelstelle, sondern eine ganze Klasse.
 *
 * Zwei Auswege gäbe es noch. `suppressHydrationWarning` versteckt die
 * Meldung, aber der Text bleibt falsch — der Nutzer sieht kurz das eine
 * und dann das andere. Alles auf dem Server zu formatieren geht nicht,
 * weil manche Komponenten im Browser leben müssen.
 *
 * Also: eigene Namen, eigene Muster. Überall dasselbe Ergebnis, egal auf
 * welchem Gerät. Der Preis ist diese Datei, und das ist ein guter Preis.
 */

export const MONTH_SHORT = [
  "Jan.",
  "Feb.",
  "März",
  "Apr.",
  "Mai",
  "Juni",
  "Juli",
  "Aug.",
  "Sept.",
  "Okt.",
  "Nov.",
  "Dez.",
] as const;

export const MONTH_LONG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export const DAY_SHORT = [
  "So.",
  "Mo.",
  "Di.",
  "Mi.",
  "Do.",
  "Fr.",
  "Sa.",
] as const;

export const DAY_LONG = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;

const zwei = (n: number): string => String(n).padStart(2, "0");

/** „9. Sept. 2026" */
export function dateMedium(d: Date): string {
  return `${d.getDate()}. ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** „9. September" — ohne Jahr, für Zeiträume innerhalb eines Jahres. */
export function dayMonthLong(d: Date): string {
  return `${d.getDate()}. ${MONTH_LONG[d.getMonth()]}`;
}

/** „9. Sept." */
export function dayMonthShort(d: Date): string {
  return `${d.getDate()}. ${MONTH_SHORT[d.getMonth()]}`;
}

/** „09.09." — für Achsen und enge Stellen. */
export function dayMonthNumeric(d: Date): string {
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.`;
}

/** „13:45" */
export function time(d: Date): string {
  return `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/**
 * „Mi. 13:45" — genau die Stelle, an der es geknallt hat.
 *
 * Ohne Komma: Es trennt zwei Angaben, die ohnehin durch ein Leerzeichen
 * getrennt sind, und die Hälfte aller ICU-Fassungen lässt es weg.
 */
export function weekdayTime(d: Date): string {
  return `${DAY_SHORT[d.getDay()]} ${time(d)}`;
}

/** „Mittwoch, 9. Sept." */
export function weekdayDate(d: Date): string {
  return `${DAY_LONG[d.getDay()]}, ${dayMonthShort(d)}`;
}

/** „Mi. 9. Sept., 13:45" — Termine mit Tag und Uhrzeit. */
export function weekdayDateTime(d: Date): string {
  return `${DAY_SHORT[d.getDay()]} ${dayMonthShort(d)}, ${time(d)}`;
}

/** „Mi." */
export function weekdayShort(d: Date): string {
  return DAY_SHORT[d.getDay()]!;
}

/** „September 2026" */
export function monthYear(d: Date): string {
  return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** „Mittwoch 13:45" — Termin heute, Wochentag ausgeschrieben. */
export function weekdayTimeLong(d: Date): string {
  return `${DAY_LONG[d.getDay()]} ${time(d)}`;
}

/** „Mittwoch, 09. September" */
export function weekdayDayMonthLong(d: Date): string {
  return `${DAY_LONG[d.getDay()]}, ${zwei(d.getDate())}. ${MONTH_LONG[d.getMonth()]}`;
}

/** „9. September" — ohne Jahr, für Wochenzeiträume. */
export function dayMonthLongNoYear(d: Date): string {
  return dayMonthLong(d);
}
