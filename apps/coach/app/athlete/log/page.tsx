import { fetchActivePlan, fetchMyCheckIns, fetchSessions } from "@ptfive/db";
import {
  bestSet,
  estimateOneRepMax,
  volumeByDay,
  type VolumePoint,
} from "@ptfive/coach-engine";
import type { MovementPattern, MuscleGroup } from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  LogWorkout,
  type ExerciseOption,
  type LastEffort,
  type PersonalBest,
  type PlanDayOption,
} from "./client";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const db = createServerSupabase();

  const [{ data: rows }, sessions, plan, checkIns] = await Promise.all([
    db
      .from("exercises")
      .select(
        "id, name, pattern, muscle_group, secondary_muscle_groups, bodyweight_factor, default_block, cue, setup, common_fault, is_bodyweight",
      )
      .order("name"),
    fetchSessions(db, { sinceDays: 365 }),
    fetchActivePlan(db),
    // Für die wirksame Last bei Körpergewichtsübungen. Zwölf reichen —
    // gesucht ist der jüngste Eintrag mit einem Gewicht.
    fetchMyCheckIns(db, 12),
  ]);

  /**
   * Aktuelles Körpergewicht des Athleten.
   *
   * Aus dem jüngsten Check-in, in dem eines steht. Fehlt es, bleibt es
   * null — dann laufen Körpergewichtsübungen weiter über die
   * Wiederholungen, und der Screen sagt, warum.
   */
  const bodyWeightKg =
    [...checkIns]
      .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
      .find((c) => c.weightKg !== null)?.weightKg ?? null;

  const exercises: ExerciseOption[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    // null bei Rumpfarbeit — die läuft bewusst ohne Musterkurve.
    pattern: (r.pattern as MovementPattern | null) ?? null,
    muscleGroup: r.muscle_group as MuscleGroup,
    secondaryMuscleGroups:
      (r.secondary_muscle_groups as MuscleGroup[] | null) ?? [],
    bodyweightFactor:
      r.bodyweight_factor === null || r.bodyweight_factor === undefined
        ? null
        : Number(r.bodyweight_factor),
    block: r.default_block as ExerciseOption["block"],
    cue: (r.cue as string | null) ?? null,
    setup: (r.setup as string | null) ?? null,
    commonFault: (r.common_fault as string | null) ?? null,
    isBodyweight: r.is_bodyweight as boolean,
  }));

  /**
   * Bestleistung je Übung — erscheint beim Loggen als Zielmarke.
   * Das ist der Unterschied zu Apps, die nur die letzte Einheit zeigen.
   */
  const bests: Record<string, PersonalBest> = {};

  /**
   * Der zuletzt geloggte Satz je Übung — Grundlage für die Übernahme
   * per Fingertipp. Sessions kommen aufsteigend, der letzte Treffer
   * gewinnt also automatisch.
   */
  const lastEfforts: Record<string, LastEffort> = {};

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

      // Für die Übernahme zählt der schwerste Satz der letzten Einheit —
      // nicht der letzte, denn am Ende stehen oft Abfallsätze.
      lastEfforts[slot.exerciseId] = {
        weightKg: best.weightKg,
        reps: best.reps,
        setCount: slot.sets.length,
        on: session.performedAt,
      };
    }
  }

  // Zuletzt benutzte Übungen zuerst — spart im Gym das Suchen.
  const recent: string[] = [];
  for (const session of [...sessions].reverse()) {
    for (const slot of session.slots) {
      if (!recent.includes(slot.exerciseId)) recent.push(slot.exerciseId);
    }
    if (recent.length >= 8) break;
  }

  // Nur Tage mit Slots anbieten — ein leerer Tag wäre eine Sackgasse.
  const planDays: PlanDayOption[] = (plan?.days ?? [])
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
        supersetGroup: s.supersetGroup,
        tempo: s.tempo,
        restSeconds: s.restSeconds,
        note: s.note,
      })),
    }));

  /**
   * Das zuletzt bewegte Volumen je Trainingstag.
   *
   * Damit der Athlet am Ende sieht, wo er gegenüber dem letzten Mal
   * steht — ohne dass die Einheit dafür erst gespeichert sein muss.
   */
  const lastVolumes: Record<string, VolumePoint> = {};
  for (const [dayId, points] of volumeByDay(sessions)) {
    const letzter = points[points.length - 1];
    if (letzter) lastVolumes[dayId] = letzter;
  }

  // Welcher Plantag zuletzt gemacht wurde — daraus folgt der Vorschlag.
  let lastPlanDayId: string | null = null;
  for (const session of sessions) {
    if (session.planDayId) lastPlanDayId = session.planDayId;
  }

  return (
    <LogWorkout
      exercises={exercises}
      bests={bests}
      lastEfforts={lastEfforts}
      recentExerciseIds={recent}
      planId={plan?.id ?? null}
      planName={plan?.name ?? null}
      planDays={planDays}
      lastPlanDayId={lastPlanDayId}
      lastVolumes={lastVolumes}
      bodyWeightKg={bodyWeightKg}
      startDayId={searchParams.day ?? null}
    />
  );
}
