import Link from "next/link";
import { fetchAppointmentsBetween } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { IconChevronLeft, IconClock, IconPin } from "@/app/icons";
import { getT } from "@/app/i18n/server";

export const dynamic = "force-dynamic";

/** Kalendertage bis zum Termin, zwischen lokalen Mitternächten. */
function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export default async function AthleteSchedulePage() {
  const t = getT();
  const s = t.athlete.schedule;
  const db = createServerSupabase();

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(Date.now() + 120 * 86_400_000);

  const past = new Date(Date.now() - 30 * 86_400_000);
  const [upcoming, recent] = await Promise.all([
    fetchAppointmentsBetween(db, from, to),
    fetchAppointmentsBetween(db, past, from),
  ]);

  const planned = upcoming.filter((a) => a.status !== "cancelled");

  return (
    <main className="gym-shell" style={{ paddingTop: 22 }}>
      <Link
        href="/athlete"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "var(--pt-fs-md)",
          color: "var(--g-dim)",
          textDecoration: "none",
        }}
      >
        <IconChevronLeft size={16} />
        {s.back}
      </Link>

      <h1 style={{ margin: "12px 0 20px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        {s.title}
      </h1>

      {planned.length === 0 ? (
        <div className="gym-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
            {s.nothing}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-dim)",
              lineHeight: 1.55,
            }}
          >
            {s.nothingBody}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {planned.map((a) => (
            <div key={a.id} className="gym-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: "var(--pt-fs-lg)", fontWeight: 700 }}>
                  {t.fmt.weekdayDayMonthLong(new Date(a.startsAt))}
                </span>
                <span
                  style={{
                    fontSize: "var(--pt-fs-sm)",
                    fontWeight: 600,
                    color: "var(--g-accent)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.inDays(daysUntil(a.startsAt))}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 10,
                  fontSize: "var(--pt-fs-md)",
                  color: "var(--g-dim)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <IconClock size={15} />
                  {t.fmt.time(new Date(a.startsAt))} · {a.durationMinutes}{" "}
                  {s.minutesShort}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <IconPin size={15} />
                  {t.labels.location[a.location]}
                  {a.locationNote ? ` · ${a.locationNote}` : ""}
                </span>
              </div>

              {a.notes && (
                <p
                  style={{
                    margin: "12px 0 0",
                    paddingTop: 10,
                    borderTop: "1px solid var(--g-border)",
                    fontSize: "var(--pt-fs-md)",
                    lineHeight: 1.55,
                  }}
                >
                  {a.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <p className="gym-label" style={{ margin: "26px 0 10px" }}>
            {s.recent}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {recent
              .slice()
              .reverse()
              .slice(0, 8)
              .map((a) => (
                <div
                  key={a.id}
                  className="gym-card"
                  style={{ padding: 13, opacity: 0.85 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: "var(--pt-fs-md)",
                    }}
                  >
                    <span>
                      {t.fmt.weekdayDayMonthLong(new Date(a.startsAt))} ·{" "}
                      {t.fmt.time(new Date(a.startsAt))}
                    </span>
                    <span
                      style={{
                        color:
                          a.status === "no_show"
                            ? "var(--g-accent)"
                            : "var(--g-dim)",
                        whiteSpace: "nowrap",
                        fontSize: "var(--pt-fs-base)",
                      }}
                    >
                      {s.status[a.status] ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
