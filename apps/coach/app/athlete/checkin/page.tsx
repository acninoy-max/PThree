import Link from "next/link";
import {
  DEFAULT_CHECK_IN_FIELDS,
  fetchCheckInConfig,
  fetchMyCheckIns,
} from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { IconChevronLeft } from "@/app/icons";
import { CheckInForm } from "./form";
import { getT } from "@/app/i18n/server";
import type { Dict } from "@/app/i18n";
import { MEASURE_INFO, MEASURE_KEYS, faelligeBereiche } from "./measurements";
import { montagVon, plusTage, tagISO, zeitpunkt } from "@/app/zone";

export const dynamic = "force-dynamic";

/**
 * Montag der Woche, in der das Datum liegt — in Amsterdam (zone.ts).
 * „Lokal" hieß auf dem Server UTC: Montag 00:30 zählte noch zur Vorwoche.
 */
function mondayOf(d: Date): string {
  return montagVon(tagISO(d));
}

function weekLabel(t: Dict, weekOf: string): string {
  // Mittag statt Mitternacht: liegt in jeder Zone am selben Kalendertag.
  const start = zeitpunkt(weekOf, "12:00");
  const end = zeitpunkt(plusTage(weekOf, 6), "12:00");
  return `${t.fmt.dayMonthLong(start)} – ${t.fmt.dayMonthLong(end)}`;
}

export default async function AthleteCheckInPage() {
  const t = getT();
  const c0 = t.athlete.checkin;
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: client } = await db
    .from("clients")
    // `*`: coaching_type (0034) darf fehlen.
    .select("*")
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
  const dran = faelligeBereiche(
    history,
    fields,
    (client?.coaching_type as "personal" | "online" | "hybrid" | undefined) ?? "hybrid",
    thisWeek,
  );
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
        {c0.back}
      </Link>

      <h1 style={{ margin: "12px 0 2px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        {c0.title}
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
        {c0.week(weekLabel(t, thisWeek))}
      </p>

      <CheckInForm
        weekOf={thisWeek}
        // Nur, was diese Woche dran ist (Rhythmus je Bereich, 0034).
        fields={{
          ...fields,
          askWeight: dran.weight,
          askEnergy: fields.askEnergy && dran.wellbeing,
          askSleep: fields.askSleep && dran.wellbeing,
          askStress: fields.askStress && dran.wellbeing,
        }}
        measureWeek={dran.measures}
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
            {c0.coachReplies}
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
                    {c0.week(weekLabel(t, c.weekOf))}
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
