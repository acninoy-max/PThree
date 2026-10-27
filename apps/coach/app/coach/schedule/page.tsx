import {
  fetchAppointmentsBetween,
  fetchClients,
  fetchUnresolvedAppointments,
} from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { ScheduleBoard, type ScheduleView } from "./board";
import { montagVon, plusTage, tagISO, wand, zeitpunkt } from "@/app/zone";

export const dynamic = "force-dynamic";

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

  // Raster als Kalendertage in Amsterdam (zone.ts). Vorher rechnete der
  // Server die Wochengrenzen in UTC, und Termine kurz nach Mitternacht
  // fielen in die falsche Woche.
  const heute = tagISO(new Date());
  let start: string;
  let end: string;
  let monthISO: string | undefined;

  if (view === "month") {
    const w = wand(new Date());
    const erster = new Date(Date.UTC(w.jahr, w.monat + offset, 1));
    monthISO = erster.toISOString().slice(0, 10);
    const letzter = new Date(Date.UTC(w.jahr, w.monat + offset + 1, 0)).toISOString().slice(0, 10);

    // Das Raster beginnt am Montag vor dem Monatsersten und läuft in
    // vollen Wochen weiter, bis der Monat abgedeckt ist.
    start = montagVon(monthISO);
    end = plusTage(montagVon(letzter), 7);
  } else {
    start = plusTage(montagVon(heute), offset * 7);
    end = plusTage(start, 7);
  }

  const [clients, appointments, unresolved] = await Promise.all([
    fetchClients(db),
    fetchAppointmentsBetween(db, zeitpunkt(start, "00:00"), zeitpunkt(end, "00:00")),
    fetchUnresolvedAppointments(db, 14),
  ]);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <ScheduleBoard
        view={view}
        rangeStartISO={start}
        rangeEndISO={end}
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
