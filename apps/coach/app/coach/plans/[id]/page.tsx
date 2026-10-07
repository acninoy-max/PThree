import { notFound } from "next/navigation";
import { getLocale, getT } from "@/app/i18n/server";
import {
  fetchClient,
  fetchExercises,
  fetchPlan,
  fetchRecentExerciseIds,
} from "@ptfive/db";
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

  const [plan, exercises, recentIds] = await Promise.all([
    fetchPlan(db, params.id),
    fetchExercises(db, getLocale()),
    fetchRecentExerciseIds(db, user!.id),
  ]);

  if (!plan) notFound();

  const client = await fetchClient(db, plan.clientId);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <PlanEditor
        plan={plan}
        mode={{
          kind: "plan",
          clientName: client?.fullName ?? getT().coach.feed.unknown,
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
    </>
  );
}
