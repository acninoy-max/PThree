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
import { weekdayDateTime } from "@/app/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  active: "Aktiv",
  paused: "Pausiert",
  archived: "Archiviert",
} as const;

/** „vor 3 Tagen“ statt eines Datums — schneller zu erfassen. */
function ago(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 14) return "vor 1 Woche";
  if (days < 60) return `vor ${Math.floor(days / 7)} Wochen`;
  return `vor ${Math.floor(days / 30)} Monaten`;
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
      rank[a.status] - rank[b.status] || a.fullName.localeCompare(b.fullName),
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
              Betreuung
            </p>
            <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
              Klienten{" "}
              <span style={{ color: "var(--pt-text-dim)" }}>
                {clients.length}
              </span>
            </h1>
          </div>
          <Link href="/coach/clients/new" className="pt-btn">
            Klient anlegen
          </Link>
        </div>

        {clients.length === 0 ? (
          <EmptyState
            title="Noch keine Klienten"
            body="Leg deinen ersten Klienten an — oder spiel Demo-Daten ein, um die App mit echten Verläufen zu sehen."
            hint="select seed_demo_data('deine@mail.de');"
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
                        <Chip tone="muted">{STATUS_LABEL[client.status]}</Chip>
                      )}
                      {client.profileId === null && (
                        <Chip tone="muted">kein App-Zugang</Chip>
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
                              {weekdayDateTime(new Date(nextAppt.startsAt))}
                            </strong>
                          </>
                        ) : (
                          "kein Termin geplant"
                        )}
                      </span>
                      <span>
                        {last
                          ? `zuletzt trainiert ${ago(last.performedAt)}`
                          : "noch nie trainiert"}
                      </span>
                      <span>{own.length} Einheiten</span>
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
                    {hasCheckIn && <Chip tone="good">Check-in</Chip>}
                    {flags.length > 0 && (
                      <Chip tone="alert">
                        {flags.length === 1
                          ? "1 Hinweis"
                          : `${flags.length} Hinweise`}
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
