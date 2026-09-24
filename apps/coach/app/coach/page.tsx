import Link from "next/link";
import {
  fetchClients,
  fetchOpenCheckIns,
  fetchSessions,
  fetchUpcomingAppointments,
} from "@ptfive/db";
import { buildCoachFeed, type ClientWithSessions } from "@ptfive/coach-engine";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { Avatar, EmptyState, InsightCard, StatCard } from "@/app/components";
import { weekdayDateTime } from "@/app/format";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const [clients, sessions, appointments, checkIns] = await Promise.all([
    fetchClients(db),
    fetchSessions(db, { sinceDays: 120 }),
    fetchUpcomingAppointments(db, 7),
    fetchOpenCheckIns(db),
  ]);

  const byClient = new Map(clients.map((c) => [c.id, c.fullName]));

  // Die Engine bekommt exakt die Daten, die RLS durchgelassen hat.
  const entries: ClientWithSessions[] = clients.map((client) => ({
    client,
    sessions: sessions.filter((s) => s.clientId === client.id),
  }));
  const feed = buildCoachFeed(entries);

  const urgent = feed.filter((i) => i.severity === "flag").length;
  const activeClients = clients.filter((c) => c.status === "active").length;

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell">
        <div style={{ marginBottom: 20 }}>
          <p className="pt-label" style={{ margin: 0 }}>
            Coach-Feed
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            Heute für dich
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <StatCard label="Aktive Klienten" value={activeClients} />
          <StatCard label="Dringend" value={urgent} />
          <StatCard label="Termine (7 Tage)" value={appointments.length} />
          <StatCard label="Offene Check-ins" value={checkIns.length} />
        </div>

        {/* Klasse statt Inline-Style: Ein `style`-Attribut schlägt jede
            Regel aus dem Stylesheet, auch die aus der Media-Query. Am
            Handy blieben hier deshalb zwei Spalten stehen, die linke
            etwa 120px breit — die Hinweiskarte brach Wort für Wort um
            und der Klientenname wurde abgeschnitten. */}
        <div className="pt-split">
          <section>
            <p className="pt-label" style={{ marginBottom: 10 }}>
              Was die Engine sieht
            </p>
            {feed.length === 0 ? (
              <EmptyState
                title="Noch nichts zu melden"
                body={
                  clients.length === 0
                    ? "Es sind noch keine Klienten angelegt. Mit Demo-Daten siehst du sofort, wie der Feed arbeitet."
                    : "Alle Klienten laufen sauber — keine Plateaus, niemand inaktiv."
                }
                hint={
                  clients.length === 0
                    ? "select seed_demo_data('deine@mail.de');"
                    : undefined
                }
              />
            ) : (
              feed.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  clientName={byClient.get(insight.clientId) ?? "Unbekannt"}
                />
              ))
            )}
          </section>

          <aside style={{ display: "grid", gap: 20 }}>
            <div>
              <p className="pt-label" style={{ marginBottom: 10 }}>
                Nächste Termine
              </p>
              {appointments.length === 0 ? (
                <div className="pt-card">
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--pt-fs-base)",
                      color: "var(--pt-text-dim)",
                    }}
                  >
                    Diese Woche nichts geplant.
                  </p>
                </div>
              ) : (
                <div className="pt-card" style={{ display: "grid", gap: 12 }}>
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Avatar
                        name={byClient.get(a.clientId) ?? "?"}
                        size={26}
                      />
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{ margin: 0, fontSize: "var(--pt-fs-base)", fontWeight: 500 }}
                        >
                          {byClient.get(a.clientId) ?? "Unbekannt"}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "var(--pt-fs-sm)",
                            color: "var(--pt-text-dim)",
                          }}
                        >
                          {weekdayDateTime(new Date(a.startsAt))} ·{" "}
                          {a.durationMinutes} Min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="pt-label" style={{ marginBottom: 10 }}>
                Offene Check-ins
              </p>
              {checkIns.length === 0 ? (
                <div className="pt-card">
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--pt-fs-base)",
                      color: "var(--pt-text-dim)",
                    }}
                  >
                    Alles beantwortet.
                  </p>
                </div>
              ) : (
                <Link
                  href="/coach/checkins"
                  className="pt-card"
                  style={{
                    display: "grid",
                    gap: 14,
                    color: "var(--pt-text)",
                    textDecoration: "none",
                  }}
                >
                  {checkIns.slice(0, 4).map((c) => (
                    <div key={c.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Avatar
                          name={byClient.get(c.clientId) ?? "?"}
                          size={26}
                        />
                        <p
                          style={{ margin: 0, fontSize: "var(--pt-fs-base)", fontWeight: 500 }}
                        >
                          {byClient.get(c.clientId) ?? "Unbekannt"}
                        </p>
                      </div>
                      {c.clientNote && (
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: "var(--pt-fs-sm)",
                            color: "var(--pt-text-dim)",
                            lineHeight: 1.45,
                          }}
                        >
                          „{c.clientNote}“
                        </p>
                      )}
                    </div>
                  ))}
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--pt-fs-sm)",
                      fontWeight: 600,
                      color: "var(--pt-action)",
                    }}
                  >
                    {checkIns.length > 4
                      ? `Alle ${checkIns.length} beantworten →`
                      : "Jetzt beantworten →"}
                  </p>
                </Link>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
