import { fetchClients, fetchCoachCheckIns } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { EmptyState } from "@/app/components";
import { CheckInInbox } from "./inbox";

export const dynamic = "force-dynamic";

export default async function CheckInsPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const [clients, checkIns] = await Promise.all([
    fetchClients(db),
    fetchCoachCheckIns(db, 10),
  ]);

  const names = new Map(clients.map((c) => [c.id, c.fullName]));

  // Gewichtsverlauf je Klient, damit die Veränderung zur Vorwoche im
  // Posteingang steht statt in einem separaten Klick.
  const weightsByClient = new Map<string, { weekOf: string; kg: number }[]>();
  for (const c of checkIns) {
    if (c.weightKg === null) continue;
    const list = weightsByClient.get(c.clientId) ?? [];
    list.push({ weekOf: c.weekOf, kg: c.weightKg });
    weightsByClient.set(c.clientId, list);
  }
  for (const list of weightsByClient.values()) {
    list.sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  }

  const items = checkIns.map((c) => {
    let deltaKg: number | null = null;
    if (c.weightKg !== null) {
      const list = weightsByClient.get(c.clientId) ?? [];
      const i = list.findIndex((w) => w.weekOf === c.weekOf);
      const before = i > 0 ? list[i - 1] : undefined;
      if (before) deltaKg = Math.round((c.weightKg - before.kg) * 10) / 10;
    }
    return {
      ...c,
      clientName: names.get(c.clientId) ?? "Unbekannt",
      deltaKg,
    };
  });

  const open = items.filter((c) => !c.coachReply);
  const answered = items.filter((c) => c.coachReply);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell">
        <div style={{ marginBottom: 20 }}>
          <p className="pt-label" style={{ margin: 0 }}>
            Check-ins
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            {open.length === 0
              ? "Alles beantwortet"
              : `${open.length} ${open.length === 1 ? "wartet" : "warten"} auf dich`}
          </h1>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Noch keine Check-ins"
            body="Sobald ein Klient sein wöchentliches Check-in abschickt, landet es hier — mit Gewichtsverlauf, Befinden und Notiz."
          />
        ) : (
          <CheckInInbox open={open} answered={answered} />
        )}
      </main>
    </>
  );
}
