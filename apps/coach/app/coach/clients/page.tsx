import Link from "next/link";
import {
  fetchClients,
  fetchOpenCheckIns,
  fetchSessions,
  fetchUpcomingAppointments,
} from "@ptfive/db";
import { analyseClient } from "@ptfive/coach-engine";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { Avatar, EmptyState } from "@/app/components";
import { getT } from "@/app/i18n/server";

export const dynamic = "force-dynamic";

/** Ganze Tage seit einem Zeitpunkt. Der Satz dazu: t.coach.clients.lastTrained. */
function daysAgo(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "alert" | "good" | "muted";
}) {
  const styles = {
    neutral: { bg: "#f1efe9", fg: "var(--pt-text-dim)" },
    alert: { bg: "#fbefea", fg: "var(--pt-action)" },
    good: { bg: "#eff3ec", fg: "#3b6d11" },
    muted: { bg: "transparent", fg: "var(--pt-text-dim)" },
  }[tone];

  return (
    <span
      style={{
        background: styles.bg,
        color: styles.fg,
        fontSize: "var(--pt-fs-xs)",
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default async function ClientsPage() {
  const t = getT();
  const C = t.coach.clients;
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
    fetchUpcomingAppointments(db, 30),
    fetchOpenCheckIns(db),
  ]);

  const openCheckInIds = new Set(checkIns.map((c) => c.clientId));

  // Aktive zuerst, dann pausiert, archiviert ganz nach unten.
  const rank = { active: 0, paused: 1, archived: 2 } as const;
  const sorted = [...clients].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.fullName.localeCompare(b.fullName, t.locale),
  );

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <p className="pt-label" style={{ margin: 0 }}>
              {C.kicker}
            </p>
            <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
              {C.title}{" "}
              <span style={{ color: "var(--pt-text-dim)" }}>
                {clients.length}
              </span>
            </h1>
          </div>
          <Link href="/coach/clients/new" className="pt-btn">
            {C.create}
          </Link>
        </div>

        {clients.length === 0 ? (
          <EmptyState
            title={C.none}
            body={C.noneBody}
            hint={t.coach.feed.seedHint}
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sorted.map((client) => {
              const own = sessions.filter((s) => s.clientId === client.id);
              const last = own[own.length - 1];
              const insights = analyseClient(client, own);
              const flags = insights.filter((i) => i.severity === "flag");
              const nextAppt = appointments.find(
                (a) => a.clientId === client.id,
              );
              const hasCheckIn = openCheckInIds.has(client.id);

              return (
                <Link
                  key={client.id}
                  href={`/coach/clients/${client.id}`}
                  className="pt-card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 14,
                    color: "inherit",
                    textDecoration: "none",
                    opacity: client.status === "archived" ? 0.55 : 1,
                  }}
                >
                  <Avatar name={client.fullName} size={40} />

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 500, fontSize: "var(--pt-fs-lg)" }}>
                        {client.fullName}
                      </span>
                      {client.status !== "active" && (
                        <Chip tone="muted">{t.labels.clientStatus[client.status]}</Chip>
                      )}
                      {client.profileId === null && (
                        <Chip tone="muted">{C.noAppAccess}</Chip>
                      )}
                    </div>

                    {/* Die Zeile, die den Blick trägt: Termin, letztes Training,
                        offenes Check-in. */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginTop: 5,
                        fontSize: "var(--pt-fs-base)",
                        color: "var(--pt-text-dim)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        {nextAppt ? (
                          <>
                            <strong
                              style={{
                                color: "var(--pt-text)",
                                fontWeight: 500,
                              }}
                            >
                              {t.fmt.weekdayDateTime(new Date(nextAppt.startsAt))}
                            </strong>
                          </>
                        ) : (
                          C.noAppointment
                        )}
                      </span>
                      <span>
                        {last
                          ? C.lastTrained(daysAgo(last.performedAt))
                          : C.neverTrained}
                      </span>
                      <span>{C.sessions(own.length)}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifySelf: "end",
                    }}
                  >
                    {hasCheckIn && <Chip tone="good">{C.checkin}</Chip>}
                    {flags.length > 0 && (
                      <Chip tone="alert">
                        {C.flags(flags.length)}
                      </Chip>
                    )}
                    <span style={{ color: "var(--pt-text-dim)", fontSize: "var(--pt-fs-xl)" }}>
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
