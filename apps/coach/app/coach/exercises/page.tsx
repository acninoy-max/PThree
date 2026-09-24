import { fetchExerciseLibrary } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { ExerciseLibrary } from "./library";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const exercises = await fetchExerciseLibrary(db);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <ExerciseLibrary exercises={exercises} />
    </>
  );
}
