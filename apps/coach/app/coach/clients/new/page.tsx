import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { NewClientForm } from "./form";
import { getT } from "@/app/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const t = getT();
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
          {t.coach.clients.allClients}
        </Link>
        <h1 style={{ margin: "14px 0 4px", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
          {t.coach.clients.newTitle}
        </h1>
        <p
          style={{
            margin: "0 0 22px",
            color: "var(--pt-text-dim)",
            fontSize: "var(--pt-fs-md)",
          }}
        >
          {t.coach.clients.newIntro}
        </p>
        <NewClientForm />
      </main>
    </>
  );
}
