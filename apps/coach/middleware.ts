import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Hält die Sitzung frisch und führt die Rollenweiche aus.
 *
 * Zwei Bereiche mit eigenen Präfixen:
 *   /coach    — Trainer, helles Editorial-Theme
 *   /athlete  — Klient, mobil optimiert
 *
 * Ein Browser trägt genau eine Sitzung. Wer beide Rollen gleichzeitig testen
 * will, braucht ein zweites Fenster im privaten Modus — sonst überschreibt
 * die zuletzt angemeldete Rolle die andere.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieToSet[]) => {
          for (const { name, value } of list) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Einladungen müssen ohne Anmeldung erreichbar sein — der Klient hat ja
  // noch kein Konto.
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/invite");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) return response;

  // Rolle bestimmen. Eine Abfrage je Anfrage — für die Beta vertretbar,
  // später beim Anmelden in ein Cookie schreiben.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAthlete = profile?.role === "athlete";
  const home = isAthlete ? "/athlete" : "/coach";

  // Falscher Bereich? Zurück in den eigenen.
  const inWrongArea = isAthlete
    ? path.startsWith("/coach")
    : path.startsWith("/athlete");

  if (inWrongArea || path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
