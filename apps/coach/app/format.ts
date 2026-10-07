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

/** Die beiden Sprachen der Oberfläche. Steht hier und nicht in i18n/,
 *  weil diese Datei ohne React und Next laufen muss (App-Tests). */
export type Locale = "en" | "de";

interface Names {
  monthShort: readonly string[];
  monthLong: readonly string[];
  dayShort: readonly string[];
  dayLong: readonly string[];
}

const DE: Names = {
  monthShort: [
    "Jan.", "Feb.", "März", "Apr.", "Mai", "Juni",
    "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez.",
  ],
  monthLong: [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ],
  dayShort: ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."],
  dayLong: [
    "Sonntag", "Montag", "Dienstag", "Mittwoch",
    "Donnerstag", "Freitag", "Samstag",
  ],
};

/**
 * Englisch mit europäischer Reihenfolge: Tag vor Monat, 24-Stunden-Uhr.
 * Die App startet in den Niederlanden — „10/07" hieße dort 10. Juli und
 * in Amerika 7. Oktober, deshalb nie Monat zuerst.
 */
const EN: Names = {
  monthShort: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  monthLong: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  dayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  dayLong: [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ],
};

const zwei = (n: number): string => String(n).padStart(2, "0");

/**
 * Tausender- und Dezimaltrennzeichen, ebenfalls selbst gesetzt.
 *
 * `toLocaleString` auf Zahlen wäre zwischen den ICU-Fassungen stabil —
 * aber dann hinge die Ausgabe an einem zweiten Mechanismus neben dieser
 * Datei, und die Sprache käme aus dem Laufzeit-Gebietsschema statt aus
 * der Einstellung des Nutzers.
 */
function zahl(n: number, digits: number, tausend: string, dezimal: string): string {
  const fest = Math.abs(n).toFixed(digits);
  const [ganz, rest] = fest.split(".");
  const gruppiert = ganz!.replace(/\B(?=(\d{3})+(?!\d))/g, tausend);
  const vorzeichen = n < 0 && Number(fest) !== 0 ? "-" : "";
  return vorzeichen + gruppiert + (rest ? dezimal + rest : "");
}

export interface Formats {
  /** „9. Sept. 2026" · „9 Sep 2026" */
  dateMedium(d: Date): string;
  /** „9. September" · „9 September" — ohne Jahr. */
  dayMonthLong(d: Date): string;
  /** „9. Sept." · „9 Sep" */
  dayMonthShort(d: Date): string;
  /** „09.09." · „09/09" — für Achsen und enge Stellen. */
  dayMonthNumeric(d: Date): string;
  /** „13:45" */
  time(d: Date): string;
  /**
   * „Mi. 13:45" · „Wed 13:45" — genau die Stelle, an der es geknallt hat.
   * Ohne Komma: Die Hälfte aller ICU-Fassungen lässt es weg.
   */
  weekdayTime(d: Date): string;
  /** „Mittwoch, 9. Sept." · „Wednesday, 9 Sep" */
  weekdayDate(d: Date): string;
  /** „Mi. 9. Sept., 13:45" · „Wed 9 Sep, 13:45" */
  weekdayDateTime(d: Date): string;
  /** „Mi." · „Wed" */
  weekdayShort(d: Date): string;
  /** „Mittwoch" · „Wednesday" */
  weekdayLong(d: Date): string;
  /** „September 2026" */
  monthYear(d: Date): string;
  /** „Mittwoch 13:45" · „Wednesday 13:45" */
  weekdayTimeLong(d: Date): string;
  /** „Mittwoch, 09. September" · „Wednesday, 9 September" */
  weekdayDayMonthLong(d: Date): string;
  /** Wochentag nach Index, 0 = Sonntag wie bei `Date.getDay()`. */
  dayShortAt(i: number): string;
  dayLongAt(i: number): string;
  /** „1.234" · „1,234" */
  integer(n: number): string;
  /** „82,5" · „82.5" — feste Stellenzahl, Standard eine. */
  decimal(n: number, digits?: number): string;
  /**
   * „82,5" · „80" — so viele Stellen wie nötig, höchstens zwei. Für
   * Gewichte und Maße: „80,0 kg" sähe nach Messgerät aus, nicht nach
   * Eingabe.
   */
  num(n: number): string;
  /**
   * Veränderung mit Vorzeichen: „−15", „+2,5", „±0".
   *
   * Aus dem Meeting 16.09: „Bei dem Gewichtsverlust muss irgendwo
   * gehighlighted werden, z. B. −15 kg." Drei Entscheidungen:
   *
   * 1. Das Minus ist U+2212, nicht der Bindestrich. Auf einer
   *    Ziffernzeile sitzt der Bindestrich zu hoch und zu kurz.
   * 2. Eine Nachkommastelle nur, wo sie etwas sagt. Ab 100 aufwärts —
   *    Volumen bewegt sich in Tausendern — ist sie Rauschen.
   * 3. Kein Wort, keine Bewertung. −15 kg auf der Waage ist ein Erfolg,
   *    beim Bankdrücken das Gegenteil; die Funktion weiß nicht, was
   *    gemessen wird. Die Einheit hängt der Aufrufer an.
   */
  signed(delta: number): string;
}

function signedMit(delta: number, tausend: string, dezimal: string): string {
  const grob = Math.abs(delta) >= 100;
  const gerundet = grob ? Math.round(delta) : Math.round(delta * 10) / 10;
  // Nach dem Runden, nicht davor: −0,04 ist keine Veränderung, und
  // „−0" wäre schlicht falsch.
  if (gerundet === 0) return "±0";
  const betrag = Math.abs(gerundet);
  // „2,0 kg" schreibt niemand — also so viele Stellen wie nötig.
  const zahlText = zahl(betrag, grob || betrag % 1 === 0 ? 0 : 1, tausend, dezimal);
  return `${gerundet > 0 ? "+" : "\u2212"}${zahlText}`;
}

/** Nachkommastellen, die eine Zahl wirklich braucht (0 bis 2). */
function stellen(n: number): number {
  const r = Math.round(n * 100);
  return r % 100 === 0 ? 0 : r % 10 === 0 ? 1 : 2;
}

function deFormats(): Formats {
  const n = DE;
  const dayMonthShort = (d: Date) => `${d.getDate()}. ${n.monthShort[d.getMonth()]}`;
  const time = (d: Date) => `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
  return {
    dateMedium: (d) => `${d.getDate()}. ${n.monthShort[d.getMonth()]} ${d.getFullYear()}`,
    dayMonthLong: (d) => `${d.getDate()}. ${n.monthLong[d.getMonth()]}`,
    dayMonthShort,
    dayMonthNumeric: (d) => `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.`,
    time,
    weekdayTime: (d) => `${n.dayShort[d.getDay()]} ${time(d)}`,
    weekdayDate: (d) => `${n.dayLong[d.getDay()]}, ${dayMonthShort(d)}`,
    weekdayDateTime: (d) => `${n.dayShort[d.getDay()]} ${dayMonthShort(d)}, ${time(d)}`,
    weekdayShort: (d) => n.dayShort[d.getDay()]!,
    weekdayLong: (d) => n.dayLong[d.getDay()]!,
    monthYear: (d) => `${n.monthLong[d.getMonth()]} ${d.getFullYear()}`,
    weekdayTimeLong: (d) => `${n.dayLong[d.getDay()]} ${time(d)}`,
    weekdayDayMonthLong: (d) =>
      `${n.dayLong[d.getDay()]}, ${zwei(d.getDate())}. ${n.monthLong[d.getMonth()]}`,
    dayShortAt: (i) => n.dayShort[i]!,
    dayLongAt: (i) => n.dayLong[i]!,
    integer: (x) => zahl(Math.round(x), 0, ".", ","),
    decimal: (x, digits = 1) => zahl(x, digits, ".", ","),
    num: (x) => zahl(x, stellen(x), ".", ","),
    signed: (x) => signedMit(x, ".", ","),
  };
}

function enFormats(): Formats {
  const n = EN;
  const dayMonthShort = (d: Date) => `${d.getDate()} ${n.monthShort[d.getMonth()]}`;
  const time = (d: Date) => `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
  return {
    dateMedium: (d) => `${d.getDate()} ${n.monthShort[d.getMonth()]} ${d.getFullYear()}`,
    dayMonthLong: (d) => `${d.getDate()} ${n.monthLong[d.getMonth()]}`,
    dayMonthShort,
    dayMonthNumeric: (d) => `${zwei(d.getDate())}/${zwei(d.getMonth() + 1)}`,
    time,
    weekdayTime: (d) => `${n.dayShort[d.getDay()]} ${time(d)}`,
    weekdayDate: (d) => `${n.dayLong[d.getDay()]}, ${dayMonthShort(d)}`,
    weekdayDateTime: (d) => `${n.dayShort[d.getDay()]} ${dayMonthShort(d)}, ${time(d)}`,
    weekdayShort: (d) => n.dayShort[d.getDay()]!,
    weekdayLong: (d) => n.dayLong[d.getDay()]!,
    monthYear: (d) => `${n.monthLong[d.getMonth()]} ${d.getFullYear()}`,
    weekdayTimeLong: (d) => `${n.dayLong[d.getDay()]} ${time(d)}`,
    weekdayDayMonthLong: (d) =>
      `${n.dayLong[d.getDay()]}, ${d.getDate()} ${n.monthLong[d.getMonth()]}`,
    dayShortAt: (i) => n.dayShort[i]!,
    dayLongAt: (i) => n.dayLong[i]!,
    integer: (x) => zahl(Math.round(x), 0, ",", "."),
    decimal: (x, digits = 1) => zahl(x, digits, ",", "."),
    num: (x) => zahl(x, stellen(x), ",", "."),
    signed: (x) => signedMit(x, ",", "."),
  };
}

const CACHE: Record<Locale, Formats> = { de: deFormats(), en: enFormats() };

/** Die Formate einer Sprache. In Komponenten über `t.fmt` erreichbar. */
export function formats(locale: Locale): Formats {
  return CACHE[locale];
}
