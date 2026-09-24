import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Die Stelle, an der ein Link aus einer Mail ankommt.
 *
 * Supabase schickt keine Mail auf diese Adresse. Es schickt den Nutzer
 * zuerst auf seine eigene `/auth/v1/verify`, prueft dort das Merkmal aus
 * dem Link und leitet DANN hierher weiter. Was hier ankommt, ist also
 * schon geprueft — fehlt nur noch die Sitzung im Cookie.
 *
 * Zwei Formen, weil es zwei Vorlagen-Varianten gibt:
 *
 *   ?code=…                     der Normalfall mit {{ .ConfirmationURL }}
 *   ?token_hash=…&type=recovery wenn jemand die Vorlage auf
 *                               {{ .TokenHash }} umstellt
 *
 * Die zweite Form kostet zehn Zeilen und erspart eine Fehlersuche, die
 * sonst erst auftritt, wenn schon jemand draussen auf die Mail wartet.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  // Wohin danach. Nur eigene Pfade zulassen: Ein `next`, das ein
  // Fremder setzen kann, ist sonst eine offene Weiterleitung — und
  // Weiterleitungen aus einer Mail heraus sind genau das, womit man
  // Leute auf nachgebaute Anmeldeseiten schickt.
  const rohNext = url.searchParams.get("next") ?? "/";
  const next = rohNext.startsWith("/") && !rohNext.startsWith("//")
    ? rohNext
    : "/";

  const zurueckMitFehler = (grund: string) =>
    NextResponse.redirect(new URL(`/auth/passwort?fehler=${grund}`, url.origin));

  // Supabase haengt bei abgelaufenen oder schon benutzten Links seinen
  // eigenen Fehler an, statt `code` zu setzen.
  const fehlerCode = url.searchParams.get("error_code");
  if (fehlerCode) {
    return zurueckMitFehler(
      fehlerCode === "otp_expired" ? "abgelaufen" : "ungueltig",
    );
  }

  if (!code && !tokenHash) return zurueckMitFehler("ungueltig");

  // Eigener Client statt `createServerSupabase()`: Der schreibt Cookies
  // in den Speicher von `next/headers`, und in einer Route brauchen wir
  // sie an DIESER Antwort. Sonst wird die Sitzung erzeugt und geht auf
  // dem Weg zum Browser verloren.
  let antwort = NextResponse.redirect(new URL(next, url.origin));

  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieToSet[]) => {
          for (const { name, value, options } of list) {
            antwort.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : await db.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: (type as "recovery") ?? "recovery",
      });

  if (error) {
    /*
      Der haeufigste Grund steht nicht in der Meldung: ein anderer
      Browser.

      Beim Anfordern legt der Browser einen Gegenschluessel ab
      (PKCE-Verifier). Der bleibt dort liegen. Wer die Mail auf dem
      Handy oeffnet, nachdem er sie am Rechner angefordert hat, bringt
      den Schluessel nicht mit — und Supabase meldet nur, der Code sei
      ungueltig.

      Deshalb ein eigener Grund, der genau das sagt. Die Alternative
      waere, den technischen Text durchzureichen, und der schickt
      jeden in die falsche Richtung.
    */
    const andererBrowser = /verifier/i.test(error.message);
    return zurueckMitFehler(andererBrowser ? "browser" : "abgelaufen");
  }

  return antwort;
}
