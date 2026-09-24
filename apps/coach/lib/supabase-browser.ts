import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-Client für Client-Komponenten.
 *
 * Bewusst getrennt vom Server-Client: Sobald `next/headers` in einer Datei
 * steht, darf sie nicht mehr im Browser gebündelt werden.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
