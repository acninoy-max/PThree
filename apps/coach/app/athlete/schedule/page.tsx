import Link from "next/link";
import { fetchAppointmentsBetween } from "@ptfive/db";
import type { Appointment } from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";
import { IconChevronLeft, IconClock, IconPin } from "@/app/icons";
import { time, weekdayDayMonthLong } from "@/app/format";

export const dynamic = "force-dynamic";

const LOCATION: Record<Appointment["location"], string> = {
  gym: "Studio",
  park: "Park",
  home: "Zuhause",
  online: "Online",
};

const STATUS_LABEL: Partial<Record<Appointment["status"], string>> = {
  completed: "Stattgefunden",
  no_show: "Verpasst",
  cancelled: "Abgesagt",
  rescheduled: "Verschoben",
};

/** Wie viele Tage bis zum Termin — als Alltagssprache. */
function inDays(iso: string): string {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  if (days < 7) return `in ${days} Tagen`;
  if (days < 14) return "nächste Woche";
  return `in ${Math.round(days / 7)} Wochen`;
}

export default async function AthleteSchedulePage() {
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
        Zurück
      </Link>

      <h1 style={{ margin: "12px 0 20px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        Deine Termine
      </h1>

      {planned.length === 0 ? (
        <div className="gym-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
            Nichts geplant
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-dim)",
              lineHeight: 1.55,
            }}
          >
            Sobald dein Coach einen Termin einträgt, erscheint er hier.
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
                  {weekdayDayMonthLong(new Date(a.startsAt))}
                </span>
                <span
                  style={{
                    fontSize: "var(--pt-fs-sm)",
                    fontWeight: 600,
                    color: "var(--g-accent)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inDays(a.startsAt)}
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
                  {time(new Date(a.startsAt))} · {a.durationMinutes} Min
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <IconPin size={15} />
                  {LOCATION[a.location]}
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
            Zuletzt
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
                      {weekdayDayMonthLong(new Date(a.startsAt))} ·{" "}
                      {time(new Date(a.startsAt))}
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
                      {STATUS_LABEL[a.status] ?? "—"}
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
