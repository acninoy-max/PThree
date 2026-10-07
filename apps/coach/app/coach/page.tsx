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
import { getT } from "@/app/i18n/server";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const t = getT();
  const F = t.coach.feed;
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
            {F.kicker}
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            {F.title}
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
          <StatCard label={F.activeClients} value={activeClients} />
          <StatCard label={F.urgent} value={urgent} />
          <StatCard label={F.appointments7} value={appointments.length} />
          <StatCard label={F.openCheckins} value={checkIns.length} />
        </div>

        {/* Klasse statt Inline-Style: Ein `style`-Attribut schlägt jede
            Regel aus dem Stylesheet, auch die aus der Media-Query. Am
            Handy blieben hier deshalb zwei Spalten stehen, die linke
            etwa 120px breit — die Hinweiskarte brach Wort für Wort um
            und der Klientenname wurde abgeschnitten. */}
        <div className="pt-split">
          <section>
            <p className="pt-label" style={{ marginBottom: 10 }}>
              {F.engineSees}
            </p>
            {feed.length === 0 ? (
              <EmptyState
                title={F.nothing}
                body={clients.length === 0 ? F.noClients : F.allGood}
                hint={
                  clients.length === 0
                    ? F.seedHint
                    : undefined
                }
              />
            ) : (
              feed.map((insight) => (
                <InsightCard
                  key={insight.id}
                  t={t}
                  insight={insight}
                  clientName={byClient.get(insight.clientId) ?? F.unknown}
                />
              ))
            )}
          </section>

          <aside style={{ display: "grid", gap: 20 }}>
            <div>
              <p className="pt-label" style={{ marginBottom: 10 }}>
                {F.nextAppointments}
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
                    {F.nothingThisWeek}
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
                          {byClient.get(a.clientId) ?? F.unknown}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "var(--pt-fs-sm)",
                            color: "var(--pt-text-dim)",
                          }}
                        >
                          {t.fmt.weekdayDateTime(new Date(a.startsAt))} ·{" "}
                          {a.durationMinutes} {F.minutesShort}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="pt-label" style={{ marginBottom: 10 }}>
                {F.openCheckins}
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
                    {F.allAnswered}
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
                          {byClient.get(c.clientId) ?? F.unknown}
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
                    {checkIns.length > 4 ? F.answerAll(checkIns.length) : F.answerNow}
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
