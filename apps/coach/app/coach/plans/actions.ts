"use server";

import { revalidatePath } from "next/cache";
import type {
  ExperienceLevel,
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";
import { getT } from "@/app/i18n/server";
import type { Dict } from "@/app/i18n";

export type PlanResult =
  { ok: true; id: string } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

function refresh(planId?: string) {
  revalidatePath("/coach/clients");
  revalidatePath("/athlete");
  revalidatePath("/athlete/log");
  revalidatePath("/athlete/plan");
  if (planId) revalidatePath(`/coach/plans/${planId}`);
}

/**
 * Legt einen Plan an.
 *
 * Ein Klient hat genau einen aktiven Plan. Der neue wird aktiv, alle
 * bisherigen werden stillgelegt — sonst wüsste die Athleten-App nicht,
 * welchem Plan sie heute folgen soll. Die alten bleiben erhalten: Ihre
 * Einheiten hängen daran und die Historie soll nicht abreißen.
 */
export async function createPlanAction(input: {
  clientId: string;
  name: string;
  level: ExperienceLevel;
  startsOn: string;
  dayTitles: string[];
}): Promise<PlanResult> {
  const t = getT();
  const name = input.name.trim();
  if (name === "") return { ok: false, error: t.coach.planErrors.planName };

  const titles = input.dayTitles.map((t) => t.trim()).filter((t) => t !== "");
  if (titles.length === 0) {
    return { ok: false, error: t.coach.planErrors.oneDay };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  await db
    .from("plans")
    .update({ is_active: false })
    .eq("client_id", input.clientId)
    .eq("is_active", true);

  const { data: plan, error } = await db
    .from("plans")
    .insert({
      coach_id: user.id,
      client_id: input.clientId,
      name,
      level: input.level,
      starts_on: input.startsOn,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !plan) {
    return {
      ok: false,
      error: error?.message ?? t.coach.planErrors.planNotCreated,
    };
  }

  const { error: dayError } = await db.from("plan_days").insert(
    titles.map((title, i) => ({
      plan_id: plan.id,
      position: i + 1,
      title,
    })),
  );

  // Ein Plan ohne Tage wäre eine leere Hülle — dann lieber gar keiner.
  if (dayError) {
    await db.from("plans").delete().eq("id", plan.id);
    return { ok: false, error: dayError.message };
  }

  refresh(plan.id);
  revalidatePath(`/coach/clients/${input.clientId}`);
  return { ok: true, id: plan.id };
}

export async function updatePlanAction(
  planId: string,
  patch: { name?: string; startsOn?: string; isActive?: boolean },
): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();

  // Aktivieren heißt: die anderen stilllegen.
  if (patch.isActive === true) {
    const { data: plan } = await db
      .from("plans")
      .select("client_id")
      .eq("id", planId)
      .maybeSingle();
    if (plan) {
      await db
        .from("plans")
        .update({ is_active: false })
        .eq("client_id", plan.client_id)
        .neq("id", planId);
    }
  }

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name === "")
      return { ok: false, error: t.coach.planErrors.nameEmpty };
    update.name = name;
  }
  if (patch.startsOn !== undefined) update.starts_on = patch.startsOn;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;

  const { error } = await db.from("plans").update(update).eq("id", planId);
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  return { ok: true };
}

export async function deletePlanAction(planId: string): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();
  // sessions.plan_id ist "on delete set null" — geloggte Einheiten bleiben
  // erhalten, sie verlieren nur den Bezug zum gelöschten Plan.
  const { error } = await db.from("plans").delete().eq("id", planId);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ---------- Eigene Übungen ----------

export type ExerciseResult =
  { ok: true; id: string; name: string } | { ok: false; error: string };

/**
 * Legt eine eigene Übung des Coaches an.
 *
 * `coach_id` macht sie privat: RLS lässt nur ihn und seine Klienten daran.
 * Die globale Bibliothek (coach_id null) bleibt für alle unveränderlich —
 * niemand kann versehentlich fremde Pläne kaputt machen.
 *
 * `pattern` darf null sein: Rumpfarbeit gehört in keins der fünf Muster.
 */
export async function createExerciseAction(input: {
  name: string;
  pattern: MovementPattern | null;
  muscleGroup: MuscleGroup;
  /** Optional — erweitert nur, wo die Übung gefunden wird. */
  secondaryMuscleGroups?: MuscleGroup[];
  block: TrainingBlock;
  isBodyweight: boolean;
  cue: string | null;
}): Promise<ExerciseResult> {
  const t = getT();
  const name = input.name.trim();
  if (name === "")
    return { ok: false, error: t.coach.planErrors.exerciseName };
  if (name.length > 80) return { ok: false, error: t.coach.planErrors.nameTooLong };

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  // Doppelte Namen in der eigenen Bibliothek vermeiden — im Auswahlmenü
  // wären zwei gleich benannte Einträge nicht unterscheidbar.
  const { data: existing } = await db
    .from("exercises")
    .select("id")
    .eq("coach_id", user.id)
    .ilike("name", name)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: t.coach.planErrors.exerciseExists,
    };
  }

  const cue = input.cue?.trim();
  const { data, error } = await db
    .from("exercises")
    .insert({
      coach_id: user.id,
      name,
      pattern: input.pattern,
      muscle_group: input.muscleGroup,
      // Leere Liste als NULL — der Trigger würde sie ohnehin dazu machen,
      // aber so steht die Absicht schon im Aufruf.
      secondary_muscle_groups:
        input.secondaryMuscleGroups && input.secondaryMuscleGroups.length > 0
          ? input.secondaryMuscleGroups.filter((g) => g !== input.muscleGroup)
          : null,
      default_block: input.block,
      is_bodyweight: input.isBodyweight,
      cue: cue === "" || cue === undefined ? null : cue,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? t.coach.planErrors.createFailed };
  }

  revalidatePath("/coach/exercises");
  return { ok: true, id: data.id as string, name: data.name as string };
}

export async function deleteExerciseAction(
  exerciseId: string,
): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();
  // Globale Übungen sind über RLS ohnehin geschützt; der Filter macht die
  // Absicht im Code sichtbar.
  const { error } = await db
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .not("coach_id", "is", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/exercises");
  return { ok: true };
}

// ---------- Tage ----------

export async function addPlanDayAction(
  planId: string,
  title: string,
): Promise<SimpleResult> {
  const t = getT();
  const clean = title.trim();
  if (clean === "") return { ok: false, error: t.coach.planErrors.dayName };

  const db = createServerSupabase();
  const { data: last } = await db
    .from("plan_days")
    .select("position")
    .eq("plan_id", planId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("plan_days").insert({
    plan_id: planId,
    position: (last?.position ?? 0) + 1,
    title: clean,
  });
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  return { ok: true };
}

export async function renamePlanDayAction(
  dayId: string,
  planId: string,
  title: string,
): Promise<SimpleResult> {
  const t = getT();
  const clean = title.trim();
  if (clean === "") return { ok: false, error: t.coach.planErrors.dayName };

  const db = createServerSupabase();
  const { error } = await db
    .from("plan_days")
    .update({ title: clean })
    .eq("id", dayId);
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  return { ok: true };
}

/** Betreut oder allein — die Unterscheidung, die Trainmore braucht. */
export async function setPlanDayGuidedAction(
  dayId: string,
  planId: string,
  isGuided: boolean,
): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();
  const { error } = await db
    .from("plan_days")
    .update({ is_guided: isGuided })
    .eq("id", dayId);
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  return { ok: true };
}

/**
 * Wochentage eines Trainingstags setzen.
 *
 * Eine Liste, weil derselbe Tag mehrmals pro Woche liegen darf — Ober
 * montags und donnerstags. Leer heisst "ohne festen Tag"; nicht jeder
 * Klient trainiert nach Kalender.
 *
 * Die vollstaendige Liste statt "einen Tag umschalten": Zwei Klicks kurz
 * hintereinander wuerden sonst beide vom selben alten Stand ausgehen und
 * der zweite den ersten ueberschreiben. Sortiert und doppelfrei macht es
 * ohnehin der Trigger in der Datenbank.
 */
export async function setPlanDayWeekdaysAction(
  dayId: string,
  planId: string,
  weekdays: number[],
): Promise<SimpleResult> {
  const t = getT();
  const clean = [...new Set(weekdays)].sort((a, b) => a - b);
  if (clean.some((w) => !Number.isInteger(w) || w < 1 || w > 7)) {
    return { ok: false, error: t.coach.planErrors.invalidWeekday };
  }

  const db = createServerSupabase();
  const { error } = await db
    .from("plan_days")
    // Leere Liste als NULL — so gibt es genau eine Schreibweise fuer
    // "kein fester Tag", statt zweier, die jede Abfrage kennen muesste.
    .update({ weekdays: clean.length === 0 ? null : clean })
    .eq("id", dayId);
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  revalidatePath("/athlete/plan");
  return { ok: true };
}

export async function deletePlanDayAction(
  dayId: string,
  planId: string,
): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();
  const { error } = await db.from("plan_days").delete().eq("id", dayId);
  if (error) return { ok: false, error: error.message };
  refresh(planId);
  return { ok: true };
}

// ---------- Slots ----------

export interface SlotInput {
  /** Was der Trainer sieht und wählt. */
  muscleGroup: MuscleGroup;
  /** null bei Rumpfarbeit — die läuft bewusst ohne Musterkurve. */
  pattern: MovementPattern | null;
  block: TrainingBlock;
  label: string;
  defaultExerciseId: string | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  /** Ein Buchstabe. Gleicher Buchstabe = Supersatz, zusammen ausführen. */
  supersetGroup: string | null;
  /** Vier Ziffern, z. B. "3111". */
  tempo: string | null;
  restSeconds: number | null;
  note: string | null;
}

function validateSlot(t: Dict, input: SlotInput): string | null {
  if (input.label.trim() === "") return t.coach.planErrors.slotLabel;
  if (input.targetSets < 1 || input.targetSets > 12) {
    return t.coach.planErrors.setsRange;
  }
  if (input.targetRepsMin < 1 || input.targetRepsMax > 100) {
    return t.coach.planErrors.repsImplausible;
  }
  if (input.targetRepsMin > input.targetRepsMax) {
    return t.coach.planErrors.repsOrder;
  }
  // Dieselben Regeln wie die Datenbank-Constraints — hier nur früher und
  // mit einer Meldung, die der Coach versteht.
  if (input.tempo !== null && !/^[0-9X]{4}$/.test(input.tempo)) {
    return t.coach.planErrors.tempo;
  }
  if (
    input.restSeconds !== null &&
    (input.restSeconds < 0 || input.restSeconds > 900)
  ) {
    return t.coach.planErrors.restRange;
  }
  if (input.supersetGroup !== null && !/^[A-Z]$/.test(input.supersetGroup)) {
    return t.coach.planErrors.superset;
  }
  return null;
}

function slotPayload(input: SlotInput) {
  return {
    pattern: input.pattern,
    muscle_group: input.muscleGroup,
    block: input.block,
    label: input.label.trim(),
    default_exercise_id: input.defaultExerciseId,
    target_sets: input.targetSets,
    target_reps_min: input.targetRepsMin,
    target_reps_max: input.targetRepsMax,
    superset_group: input.supersetGroup,
    tempo: input.tempo,
    rest_seconds: input.restSeconds,
    note: input.note?.trim() === "" ? null : input.note,
  };
}

export async function addSlotAction(
  dayId: string,
  planId: string,
  input: SlotInput,
): Promise<SimpleResult> {
  const t = getT();
  const problem = validateSlot(t, input);
  if (problem) return { ok: false, error: problem };

  const db = createServerSupabase();
  const { data: last } = await db
    .from("plan_slots")
    .select("position")
    .eq("plan_day_id", dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("plan_slots").insert({
    plan_day_id: dayId,
    position: (last?.position ?? 0) + 1,
    ...slotPayload(input),
  });
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  return { ok: true };
}

export async function updateSlotAction(
  slotId: string,
  planId: string,
  input: SlotInput,
): Promise<SimpleResult> {
  const t = getT();
  const problem = validateSlot(t, input);
  if (problem) return { ok: false, error: problem };

  const db = createServerSupabase();
  const { error } = await db
    .from("plan_slots")
    .update(slotPayload(input))
    .eq("id", slotId);
  if (error) return { ok: false, error: error.message };

  refresh(planId);
  return { ok: true };
}

export async function deleteSlotAction(
  slotId: string,
  planId: string,
): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();
  const { error } = await db.from("plan_slots").delete().eq("id", slotId);
  if (error) return { ok: false, error: error.message };
  refresh(planId);
  return { ok: true };
}

/**
 * Verschiebt einen Slot um eine Position.
 *
 * Es werden zwei Zeilen getauscht statt alle neu durchnummeriert — das
 * hält die Änderung klein. Eine kurzzeitige Doppelbelegung der Position
 * ist unkritisch, weil die Anzeige ohnehin sortiert.
 */
export async function moveSlotAction(
  slotId: string,
  planId: string,
  direction: "up" | "down",
): Promise<SimpleResult> {
  const t = getT();
  const db = createServerSupabase();

  const { data: slot } = await db
    .from("plan_slots")
    .select("id, plan_day_id, position")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return { ok: false, error: t.coach.planErrors.slotNotFound };

  const { data: neighbour } = await db
    .from("plan_slots")
    .select("id, position")
    .eq("plan_day_id", slot.plan_day_id)
    [direction === "up" ? "lt" : "gt"]("position", slot.position)
    .order("position", { ascending: direction !== "up" })
    .limit(1)
    .maybeSingle();

  // Am Rand angekommen — kein Fehler, es passiert nur nichts.
  if (!neighbour) return { ok: true };

  await db
    .from("plan_slots")
    .update({ position: neighbour.position })
    .eq("id", slot.id);
  await db
    .from("plan_slots")
    .update({ position: slot.position })
    .eq("id", neighbour.id);

  refresh(planId);
  return { ok: true };
}

// ---------- Fortschrittsauswahl des Trainers ----------

/**
 * Welche Übungen der Trainer in der Klientenakte sehen will.
 *
 * Eigene Liste je Klient und je Trainer — der Athlet hat seine. Der eine
 * schaut auf seine Entwicklung, der andere auf die Stellen, an denen er
 * nachsteuern will. Die Zeilensicherheit lässt jeden nur die eigene
 * Liste schreiben.
 */
export async function setCoachProgressSelectionAction(
  clientId: string,
  exerciseIds: string[],
): Promise<SimpleResult> {
  const t = getT();
  if (exerciseIds.length > 8) {
    return { ok: false, error: t.fehler.action.maxEight };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  const { data: client } = await db
    .from("clients")
    .select("id, coach_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { ok: false, error: t.coach.planErrors.clientNotFound };
  if (client.coach_id !== user.id) {
    return { ok: false, error: t.coach.planErrors.notYourClient };
  }

  const sauber = [...new Set(exerciseIds)];

  const { error: delError } = await db
    .from("progress_selections")
    .delete()
    .eq("client_id", client.id)
    .eq("viewer_id", user.id);
  if (delError) return { ok: false, error: delError.message };

  if (sauber.length > 0) {
    const { error } = await db.from("progress_selections").insert(
      sauber.map((exercise_id, i) => ({
        client_id: client.id,
        viewer_id: user.id,
        exercise_id,
        position: i + 1,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/coach/clients/${client.id}`);
  return { ok: true };
}
