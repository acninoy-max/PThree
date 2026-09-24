import Link from "next/link";
import {
  DEFAULT_CHECK_IN_FIELDS,
  fetchCheckInConfig,
  fetchMyCheckIns,
} from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { IconChevronLeft } from "@/app/icons";
import { CheckInForm } from "./form";
import { dayMonthLongNoYear } from "@/app/format";
import { MEASURE_INFO, MEASURE_KEYS, isMeasureWeek } from "./measurements";

export const dynamic = "force-dynamic";

/** Montag der Woche, in der das Datum liegt — lokal, nicht in UTC. */
function mondayOf(d: Date): string {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(
    m.getDate(),
  ).padStart(2, "0")}`;
}

function weekLabel(weekOf: string): string {
  const start = new Date(`${weekOf}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${dayMonthLongNoYear(start)} – ${dayMonthLongNoYear(end)}`;
}

export default async function AthleteCheckInPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("profile_id", user!.id)
    .maybeSingle();

  const [fields, history] = await Promise.all([
    client
      ? fetchCheckInConfig(db, client.id)
      : Promise.resolve(DEFAULT_CHECK_IN_FIELDS),
    fetchMyCheckIns(db, 6),
  ]);

  const thisWeek = mondayOf(new Date());
  const current = history.find((c) => c.weekOf === thisWeek) ?? null;
  const earlier = history.filter((c) => c.weekOf !== thisWeek);

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

      <h1 style={{ margin: "12px 0 2px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        Check-in
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
        Woche {weekLabel(thisWeek)}
      </p>

      <CheckInForm
        weekOf={thisWeek}
        fields={fields}
        measureWeek={isMeasureWeek(history, fields, thisWeek)}
        existing={
          current && {
            weightKg: current.weightKg,
            energy: current.energy,
            sleep: current.sleep,
            stress: current.stress,
            clientNote: current.clientNote ?? "",
            submittedAt: current.submittedAt,
            coachReply: current.coachReply,
            // Schon gemeldete Maße als Text, damit sie korrigierbar sind.
            measures: Object.fromEntries(
              MEASURE_KEYS.map((k) => {
                const v = current[MEASURE_INFO[k].field];
                return [k, typeof v === "number" ? String(v) : ""];
              }),
            ),
          }
        }
      />

      {/* Die Antwort des Coaches ist der eigentliche Gegenwert des Check-ins.
          Deshalb steht sie direkt unter dem Formular und nicht im Archiv. */}
      {earlier.some((c) => c.coachReply) && (
        <>
          <p className="gym-label" style={{ margin: "28px 0 10px" }}>
            Antworten deines Coaches
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {earlier
              .filter((c) => c.coachReply)
              .map((c) => (
                <div key={c.id} className="gym-card">
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--g-dim)",
                      fontWeight: 600,
                    }}
                  >
                    Woche {weekLabel(c.weekOf)}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "var(--pt-fs-md)",
                      lineHeight: 1.55,
                    }}
                  >
                    {c.coachReply}
                  </p>
                </div>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
