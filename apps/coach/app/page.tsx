import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Die Wurzel ist nur eine Weiche.
 *
 * Beide Oberflächen leben unter eigenen Präfixen — /coach und /athlete —
 * damit an der Adresse ablesbar ist, wo man gerade ist. Wer hier landet,
 * wird nach seiner Rolle weitergeschickt.
 */
export default async function RootPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.role === "athlete" ? "/athlete" : "/coach");
}
