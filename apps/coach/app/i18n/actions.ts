"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "./locale";

/**
 * Sprache wählen. Nur ein Cookie, keine Spalte in `profiles`: Auch die
 * Anmeldeseite braucht eine Sprache, und dort gibt es noch kein Profil.
 */
export async function setLocaleAction(locale: string): Promise<void> {
  // Ein beliebiger Wert im Cookie fiele in pickLocale ohnehin auf den
  // Standard zurück — aber dann hätte der Knopf „geklappt" und nichts
  // getan. Lieber laut.
  if (!isLocale(locale)) throw new Error(`Unbekannte Sprache: ${locale}`);
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
