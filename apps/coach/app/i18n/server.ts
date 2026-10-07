/**
 * Sprache und Texte in Server-Komponenten und Server Actions.
 *
 * Gelesen wird bei jeder Anfrage aus Cookie und `Accept-Language`. Das
 * macht jede Seite dynamisch — das sind sie hier ohnehin alle, weil sie
 * die Sitzung lesen.
 */
import { cookies, headers } from "next/headers";
import { dictFor, type Dict } from "./index";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./locale";

export function getLocale(): Locale {
  return pickLocale(
    cookies().get(LOCALE_COOKIE)?.value,
    headers().get("accept-language"),
  );
}

export function getT(): Dict {
  return dictFor(getLocale());
}
