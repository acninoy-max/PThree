import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Supabase-Client für Server-Komponenten und Server Actions.
 *
 * Die Sitzung liegt im Cookie — damit greift Row Level Security auf Basis des
 * angemeldeten Nutzers. Ohne gültige Sitzung liefert jede Abfrage leere
 * Ergebnisse, nicht etwa fremde Daten.
 */
export function createServerSupabase() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: CookieToSet[]) => {
          try {
            for (const { name, value, options } of list) {
              store.set(name, value, options);
            }
          } catch {
            // In Server Components ist Schreiben nicht erlaubt. Die Middleware
            // erneuert die Sitzung, deshalb ist das hier gefahrlos.
          }
        },
      },
    },
  );
}
