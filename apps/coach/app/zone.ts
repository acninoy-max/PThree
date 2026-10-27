/**
 * Die Zeitzone der App: Europe/Amsterdam, überall.
 *
 * WARUM
 * -----
 * Bis 27.10.2026 rechnete jede Stelle in der Zone ihrer Laufzeit. Der
 * Server (Vercel) läuft in UTC, der Browser in Amsterdam. Folge (Joëls
 * Test): Termin um 06:00 angelegt, der Server las „06:00 UTC" = 08:00
 * in Amsterdam. Der Kalender (Browser) zeigte 08:00, Feed und
 * Athleten-App (Server) zeigten 06:00. Der Klient stand im Zweifel zur
 * falschen Zeit im Studio.
 *
 * Trainer und Klienten sitzen in den Niederlanden und Deutschland, also
 * gibt es genau eine Zone. Alles, was Uhrzeit oder Kalendertag eines
 * Zeitpunkts braucht, fragt hier — nie `getHours()`, `getDate()` oder
 * `toDateString()`, denn die antworten in der Zone der Laufzeit.
 *
 * `Intl.DateTimeFormat` liefert hier nur Ziffern (formatToParts,
 * numerisch). Die sind in Node und Safari gleich; die Sprachunterschiede,
 * vor denen Regel 7 warnt, betreffen Monatsnamen und Reihenfolge, und die
 * baut format.ts selbst.
 *
 * Reine Logik, läuft im App-Testlauf.
 */

export const APP_ZONE = "Europe/Amsterdam";

export interface Wanduhr {
  jahr: number;
  /** 0 = Januar, wie `Date.getMonth()`. */
  monat: number;
  tag: number;
  /** 0 = Sonntag, wie `Date.getDay()`. */
  wochentag: number;
  stunde: number;
  minute: number;
}

let formatierer: Intl.DateTimeFormat | null = null;
function fmt(): Intl.DateTimeFormat {
  formatierer ??= new Intl.DateTimeFormat("en-US", {
    timeZone: APP_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  return formatierer;
}

/** Was die Uhr in Amsterdam zu diesem Zeitpunkt zeigt. */
export function wand(d: Date): Wanduhr {
  const teile: Record<string, number> = {};
  for (const p of fmt().formatToParts(d)) {
    if (p.type !== "literal") teile[p.type] = Number(p.value);
  }
  // Manche Laufzeiten schreiben Mitternacht als 24 statt 0.
  const stunde = teile.hour === 24 ? 0 : teile.hour!;
  const jahr = teile.year!;
  const monat = teile.month! - 1;
  const tag = teile.day!;
  return {
    jahr,
    monat,
    tag,
    wochentag: new Date(Date.UTC(jahr, monat, tag)).getUTCDay(),
    stunde,
    minute: teile.minute!,
  };
}

/** Abstand Amsterdam − UTC in Millisekunden zu diesem Zeitpunkt. */
function versatz(ms: number): number {
  const w = wand(new Date(ms));
  const alsUtc = Date.UTC(w.jahr, w.monat, w.tag, w.stunde, w.minute);
  return alsUtc - Math.floor(ms / 60000) * 60000;
}

/**
 * „2026-10-27" + „06:00" in Amsterdam → der Zeitpunkt.
 *
 * Zweimal gerechnet, weil der Versatz vom Ergebnis abhängt: Am Tag der
 * Zeitumstellung gilt vor 03:00 ein anderer als danach. Eine Uhrzeit,
 * die es nicht gibt (02:30 am letzten Sonntag im März), landet eine
 * Stunde später — wie jede Uhr, die man an dem Tag stellt.
 */
export function zeitpunkt(datumISO: string, zeit: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datumISO);
  const z = /^(\d{1,2}):(\d{2})$/.exec(zeit);
  if (!m || !z) return new Date(NaN);
  const naiv = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(z[1]), Number(z[2]));
  const erst = naiv - versatz(naiv);
  const zweit = naiv - versatz(erst);
  return new Date(zweit);
}

/** Kalendertag in Amsterdam als „JJJJ-MM-TT" — Ersatz für `toDateString()`. */
export function tagISO(d: Date): string {
  const w = wand(d);
  return `${w.jahr}-${String(w.monat + 1).padStart(2, "0")}-${String(w.tag).padStart(2, "0")}`;
}

/** „JJJJ-MM-TT" plus n Tage. Rein auf dem Kalender, ohne Uhrzeit. */
export function plusTage(datumISO: string, n: number): string {
  const [j, mo, t] = datumISO.split("-").map(Number);
  const d = new Date(Date.UTC(j!, mo! - 1, t! + n));
  return d.toISOString().slice(0, 10);
}

/** Montag der Woche (ISO), in der dieser Kalendertag liegt. */
export function montagVon(datumISO: string): string {
  const [j, mo, t] = datumISO.split("-").map(Number);
  const wt = new Date(Date.UTC(j!, mo! - 1, t!)).getUTCDay();
  return plusTage(datumISO, -((wt + 6) % 7));
}
