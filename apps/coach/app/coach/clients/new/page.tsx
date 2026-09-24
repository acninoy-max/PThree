import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { NewClientForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell" style={{ maxWidth: 560 }}>
        <Link
          href="/coach/clients"
          style={{ fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
        >
          ‹ Alle Klienten
        </Link>
        <h1 style={{ margin: "14px 0 4px", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
          Neuer Klient
        </h1>
        <p
          style={{
            margin: "0 0 22px",
            color: "var(--pt-text-dim)",
            fontSize: "var(--pt-fs-md)",
          }}
        >
          Der Klient wird sofort angelegt. Den Einladungslink für die App
          erzeugst du danach auf seiner Profilseite.
        </p>
        <NewClientForm />
      </main>
    </>
  );
}
