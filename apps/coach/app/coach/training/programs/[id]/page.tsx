import { notFound } from "next/navigation";
import {
  fetchClients,
  fetchExercises,
  fetchProgram,
  fetchRecentExerciseIds,
} from "@ptfive/db";
import type { Plan } from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";
import { getLocale } from "@/app/i18n/server";
import { Nav } from "@/app/nav";
import { PlanEditor } from "@/app/coach/plans/[id]/editor";
import { ProgramHeader } from "./program-header";
import { ProgramView } from "./program-view";

export const dynamic = "force-dynamic";

/**
 * Ein Programm. Eigene Programme laufen durch denselben Editor wie
 * Pläne — ein Programm ist ein Plan ohne Klienten. Vorlagen aus der App
 * sind nur lesbar (die Zeilensicherheit aus 0002 verbietet das
 * Schreiben ohnehin); geändert wird eine Kopie.
 */
export default async function ProgramPage({ params }: { params: { id: string } }) {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const [program, exercises, clients, recentIds] = await Promise.all([
    fetchProgram(db, params.id),
    fetchExercises(db, getLocale()),
    fetchClients(db),
    fetchRecentExerciseIds(db, user!.id),
  ]);
  if (!program) notFound();

  const clientPicks = clients
    .filter((c) => c.status !== "archived")
    .map((c) => ({ id: c.id, name: c.fullName }));
  const exerciseNames = Object.fromEntries(
    [...exercises.values()].map((e) => [e.id, e.name]),
  );

  // Für den Editor in die Form eines Plans bringen. Klient, Start und
  // Status gibt es beim Programm nicht; der Editor fragt sie im
  // Programm-Modus auch nicht ab.
  const alsPlan: Plan = {
    id: program.id,
    coachId: program.coachId ?? "",
    clientId: "",
    templateId: null,
    name: program.name,
    level: program.level,
    startsOn: "",
    endsOn: null,
    isActive: false,
    days: program.days,
    createdAt: "",
  };

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      {program.isSystem ? (
        <ProgramView program={program} clients={clientPicks} exerciseNames={exerciseNames} />
      ) : (
        <PlanEditor
          plan={alsPlan}
          mode={{
            kind: "program",
            backHref: "/coach/training?tab=programs",
            kopf: <ProgramHeader program={program} clients={clientPicks} />,
          }}
          recentIds={recentIds}
        exercises={[...exercises.values()].map((e) => ({
            id: e.id,
            name: e.name,
            pattern: e.pattern,
            muscleGroup: e.muscleGroup,
            secondaryMuscleGroups: e.secondaryMuscleGroups,
            defaultBlock: e.block,
            own: e.coachId !== null,
          }))}
        />
      )}
    </>
  );
}
