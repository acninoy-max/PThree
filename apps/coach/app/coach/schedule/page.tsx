import {
  fetchAppointmentsBetween,
  fetchClients,
  fetchUnresolvedAppointments,
} from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { ScheduleBoard, type ScheduleView } from "./board";

export const dynamic = "force-dynamic";

/** Montag der Woche, in der das Datum liegt. */
function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { v?: string; o?: string; w?: string };
}) {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  // Ansicht und Versatz stehen in der Adresse, damit Blättern verlinkbar
  // bleibt. `w` ist der alte Parameter und wird weiter akzeptiert.
  const view: ScheduleView = searchParams.v === "month" ? "month" : "week";
  const offset =
    Number.parseInt(searchParams.o ?? searchParams.w ?? "0", 10) || 0;

  let start: Date;
  let end: Date;
  let monthISO: string | undefined;

  if (view === "month") {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    monthISO = month.toISOString();

    // Das Raster beginnt am Montag vor dem Monatsersten und läuft in
    // vollen Wochen weiter, bis der Monat abgedeckt ist.
    start = mondayOf(month);
    const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    end = mondayOf(lastOfMonth);
    end.setDate(end.getDate() + 7);
  } else {
    start = mondayOf(new Date());
    start.setDate(start.getDate() + offset * 7);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
  }

  const [clients, appointments, unresolved] = await Promise.all([
    fetchClients(db),
    fetchAppointmentsBetween(db, start, end),
    fetchUnresolvedAppointments(db, 14),
  ]);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <ScheduleBoard
        view={view}
        rangeStartISO={start.toISOString()}
        rangeEndISO={end.toISOString()}
        monthISO={monthISO}
        offset={offset}
        appointments={appointments}
        unresolved={unresolved}
        clients={clients.map((c) => ({
          id: c.id,
          name: c.fullName,
          status: c.status,
        }))}
      />
    </>
  );
}
