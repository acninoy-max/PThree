import Link from "next/link";
import { fetchExerciseLibrary, fetchPrograms } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { getLocale, getT } from "@/app/i18n/server";
import { Nav } from "@/app/nav";
import { ExerciseLibrary } from "@/app/coach/exercises/library";
import { ProgramList } from "./program-list";

export const dynamic = "force-dynamic";

/**
 * Training: Übungen und Programme.
 *
 * Hieß „Übungen". Mit den Programmen (Pläne ohne Klienten, 0028) ist es
 * der Ort für alles, woraus ein Plan gebaut wird — deshalb ein Name für
 * beides und zwei Reiter, nach demselben Muster wie die Klientenakte
 * (?tab= in der Adresse).
 */
export default async function TrainingPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const t = getT();
  const T = t.coach.training;
  const tab = searchParams.tab === "programs" ? "programs" : "exercises";

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  // Nur laden, was der Reiter braucht.
  const [exercises, programs] = await Promise.all([
    tab === "exercises" ? fetchExerciseLibrary(db, getLocale()) : Promise.resolve([]),
    tab === "programs" ? fetchPrograms(db) : Promise.resolve([]),
  ]);

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell">
        <p className="pt-label" style={{ margin: 0 }}>
          {T.kicker}
        </p>
        <h1 style={{ margin: "2px 0 16px", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
          {T.title}
        </h1>

        <nav className="pt-subtabs" aria-label={T.title}>
          {(["exercises", "programs"] as const).map((k) => (
            <Link
              key={k}
              href={k === "exercises" ? "/coach/training" : "/coach/training?tab=programs"}
              className="pt-subtab"
              data-active={tab === k}
              aria-current={tab === k ? "page" : undefined}
            >
              {T.tabs[k]}
            </Link>
          ))}
        </nav>

        {tab === "exercises" ? (
          <ExerciseLibrary exercises={exercises} />
        ) : (
          <ProgramList programs={programs} />
        )}
      </main>
    </>
  );
}
