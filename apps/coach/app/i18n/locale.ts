/**
 * Welche Sprache eine Anfrage bekommt.
 *
 * Rein und ohne Next-Importe, damit die App-Tests es ohne Bundler
 * durchrechnen können. Die Anbindung an Cookies und Header steht in
 * server.ts.
 */
import type { Locale } from "../format";

export type { Locale };

export const LOCALES: readonly Locale[] = ["en", "de"];

/**
 * Englisch ist der Standard: Der Launch ist in den Niederlanden
 * (Entscheidung vom 07.10.2026). Deutsch bleibt wählbar.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** Gewählte Sprache. Ein Jahr gültig — sonst fragt die App jeden Monat neu. */
export const LOCALE_COOKIE = "pt_lang";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "de";
}

/**
 * Cookie vor Browser-Sprache vor Standard.
 *
 * Aus `Accept-Language` gewinnt die erste Sprache, die wir haben — in
 * der Reihenfolge, in der der Browser sie nennt, nicht nach q-Werten.
 * Die Browser schreiben sie ohnehin absteigend, und ein Parser für
 * q-Werte wäre hier mehr Code als Nutzen. Ein niederländischer Browser
 * („nl-NL,nl;q=0.9,en;q=0.8,de;q=0.7") landet so bei Englisch, nicht bei
 * Deutsch.
 */
export function pickLocale(
  cookie: string | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookie)) return cookie;
  for (const teil of (acceptLanguage ?? "").split(",")) {
    const sprache = teil.trim().split(";")[0]!.split("-")[0]!.toLowerCase();
    if (isLocale(sprache)) return sprache;
  }
  return DEFAULT_LOCALE;
}
