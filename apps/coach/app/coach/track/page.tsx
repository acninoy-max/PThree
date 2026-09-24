import Link from "next/link";
import { fetchClients, fetchPlans } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { Avatar } from "@/app/components";
import { IconChevronRight } from "@/app/icons";

export const dynamic = "force-dynamic";

/**
 * Trainer trackt für seinen Klienten — Schritt 1: Wen?
 *
 * Eine eigene Strecke und keine Erweiterung der Klientenakte: Im Studio
 * zählt, in zwei Griffen bei der Satztabelle zu sein. Die Akte ist zum
 * Nachlesen da, das hier zum Tippen zwischen zwei Sätzen.
 */
export default async function TrackPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const clients = (await fetchClients(db)).filter((c) => c.status === "active");

  // Wer keinen aktiven Plan hat, kann trotzdem frei getrackt werden —
  // die Zeile sagt es dann dazu, statt den Klienten zu verstecken.
  const plans = await Promise.all(
    clients.map(async (c) => ({
      clientId: c.id,
      plan: (await fetchPlans(db, c.id)).find((p) => p.isActive) ?? null,
    })),
  );
  const planOf = new Map(plans.map((p) => [p.clientId, p.plan]));

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell" style={{ paddingTop: 22 }}>
        <p className="pt-label">Training tracken</p>
        <h1 style={{ margin: "4px 0 6px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
          Für wen?
        </h1>
        <p
          style={{
            margin: "0 0 18px",
            fontSize: "var(--pt-fs-md)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.55,
            maxWidth: 520,
          }}
        >
          Du trägst die Sätze ein, während ihr trainiert. Die Einheit wird als{" "}
          <strong>von dir erfasst</strong> gespeichert — dein Klient sieht sie
          in seiner App.
        </p>

        {clients.length === 0 ? (
          <div className="pt-card">
            <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--pt-text-dim)" }}>
              Noch keine aktiven Klienten.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
            {clients.map((c) => {
              const plan = planOf.get(c.id) ?? null;
              const tage = plan?.days.filter((d) => d.slots.length > 0) ?? [];
              return (
                <Link
                  key={c.id}
                  href={`/coach/track/${c.id}`}
                  className="pt-pickrow"
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      minWidth: 0,
                    }}
                  >
                    <Avatar name={c.fullName} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600 }}>
                        {c.fullName}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "var(--pt-fs-sm)",
                          color: "var(--pt-text-dim)",
                          marginTop: 1,
                        }}
                      >
                        {tage.length > 0
                          ? `${plan!.name} · ${tage.length} ${tage.length === 1 ? "Tag" : "Tage"}`
                          : "Kein Plan — freies Training"}
                      </span>
                    </span>
                  </span>
                  <IconChevronRight size={17} />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
