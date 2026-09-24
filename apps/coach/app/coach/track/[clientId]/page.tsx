import { notFound } from "next/navigation";
import type { MovementPattern, MuscleGroup } from "@ptfive/types";
import {
  fetchClient,
  fetchMyCheckIns,
  fetchPlans,
  fetchSessions,
} from "@ptfive/db";
import { bestSet, estimateOneRepMax } from "@ptfive/coach-engine";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  TrackWorkout,
  type TrackExercise,
  type TrackLastEffort,
  type TrackPersonalBest,
  type TrackPlanDay,
} from "./track-client";

export const dynamic = "force-dynamic";

/**
 * Trainer trackt — Schritt 2 und 3: Tag wählen, Sätze eintragen.
 *
 * Die Daten sind dieselben wie beim Athleten: Bestleistungen, letzte
 * Lasten, Körpergewicht. Der Trainer soll dasselbe sehen wie sein Klient,
 * sonst reden die beiden über verschiedene Zahlen.
 */
export default async function TrackClientPage({
  params,
}: {
  params: { clientId: string };
}) {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const client = await fetchClient(db, params.clientId);
  if (!client || client.coachId !== user?.id) notFound();

  const [{ data: rows }, sessions, plans, checkIns] = await Promise.all([
    db
      .from("exercises")
      .select(
        "id, name, pattern, muscle_group, secondary_muscle_groups, bodyweight_factor, default_block, cue, setup, common_fault, is_bodyweight",
      )
      .order("name"),
    fetchSessions(db, { clientId: client.id, sinceDays: 365 }),
    fetchPlans(db, client.id),
    // Für die wirksame Last bei Körpergewichtsübungen.
    db
      .from("check_ins")
      .select("week_of, weight_kg")
      .eq("client_id", client.id)
      .not("weight_kg", "is", null)
      .order("week_of", { ascending: false })
      .limit(1),
  ]);

  const bodyWeightKg =
    checkIns.data && checkIns.data.length > 0
      ? Number(checkIns.data[0]!.weight_kg)
      : null;

  const exercises: TrackExercise[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    pattern: (r.pattern as MovementPattern | null) ?? null,
    muscleGroup: r.muscle_group as MuscleGroup,
    secondaryMuscleGroups:
      (r.secondary_muscle_groups as MuscleGroup[] | null) ?? [],
    bodyweightFactor:
      r.bodyweight_factor === null || r.bodyweight_factor === undefined
        ? null
        : Number(r.bodyweight_factor),
    block: r.default_block as TrackExercise["block"],
    cue: (r.cue as string | null) ?? null,
    setup: (r.setup as string | null) ?? null,
    isBodyweight: r.is_bodyweight as boolean,
  }));

  const bests: Record<string, TrackPersonalBest> = {};
  const lastEfforts: Record<string, TrackLastEffort> = {};

  for (const session of sessions) {
    for (const slot of session.slots) {
      const best = bestSet(slot.sets);
      if (!best) continue;
      const score = estimateOneRepMax(best);
      const current = bests[slot.exerciseId];
      if (!current || score > current.score) {
        bests[slot.exerciseId] = {
          score,
          weightKg: best.weightKg,
          reps: best.reps,
          isBodyweight: best.isBodyweight || best.weightKg === 0,
          on: session.performedAt,
        };
      }
      lastEfforts[slot.exerciseId] = {
        weightKg: best.weightKg,
        reps: best.reps,
        setCount: slot.sets.length,
        on: session.performedAt,
      };
    }
  }

  const plan = plans.find((p) => p.isActive) ?? null;
  const days: TrackPlanDay[] = (plan?.days ?? [])
    .filter((d) => d.slots.length > 0)
    .map((d) => ({
      id: d.id,
      title: d.title,
      isGuided: d.isGuided,
      weekdays: d.weekdays,
      slots: d.slots.map((s) => ({
        id: s.id,
        label: s.label,
        pattern: s.pattern,
        muscleGroup: s.muscleGroup,
        block: s.block,
        defaultExerciseId: s.defaultExerciseId,
        targetSets: s.targetSets,
        targetRepsMin: s.targetRepsMin,
        targetRepsMax: s.targetRepsMax,
        restSeconds: s.restSeconds,
        note: s.note,
      })),
    }));

  let lastPlanDayId: string | null = null;
  for (const session of sessions) {
    if (session.planDayId) lastPlanDayId = session.planDayId;
  }

  return (
    <TrackWorkout
      clientId={client.id}
      clientName={client.fullName}
      planId={plan?.id ?? null}
      planName={plan?.name ?? null}
      days={days}
      lastPlanDayId={lastPlanDayId}
      exercises={exercises}
      bests={bests}
      lastEfforts={lastEfforts}
      bodyWeightKg={bodyWeightKg}
    />
  );
}
