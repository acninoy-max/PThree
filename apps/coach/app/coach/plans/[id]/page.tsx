import { notFound } from "next/navigation";
import { fetchClient, fetchExercises, fetchPlan } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { PlanEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: { id: string } }) {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const [plan, exercises] = await Promise.all([
    fetchPlan(db, params.id),
    fetchExercises(db),
  ]);

  if (!plan) notFound();

  const client = await fetchClient(db, plan.clientId);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <PlanEditor
        plan={plan}
        clientName={client?.fullName ?? "Klient"}
        exercises={[...exercises.values()].map((e) => ({
          id: e.id,
          name: e.name,
          pattern: e.pattern,
          muscleGroup: e.muscleGroup,
          secondaryMuscleGroups: e.secondaryMuscleGroups,
          // fetchExercises liefert eine schlanke Form; der Block wird im
          // Formular ohnehin frei gewählt.
          defaultBlock: "compound" as const,
          own: e.coachId !== null,
        }))}
      />
    </>
  );
}
