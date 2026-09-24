"use server";

import { revalidatePath } from "next/cache";
import type {
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";

export type TrackResult =
  { ok: true; id: string } | { ok: false; error: string };

export interface TrackedSetInput {
  weightKg: number;
  bodyLoadKg: number | null;
  reps: number;
  isBodyweight: boolean;
  rir?: number | null;
}

export interface TrackedSlotInput {
  pattern: MovementPattern | null;
  muscleGroup: MuscleGroup | null;
  block: TrainingBlock;
  exerciseId: string;
  planSlotId?: string | null;
  sets: TrackedSetInput[];
}

/**
 * Der Trainer trägt eine Einheit für seinen Klienten ein.
 *
 * Zur Rechtelage: Die Zeilensicherheit erlaubt dem Coach das schon lange
 * — `sessions_coach_all` aus 0002 deckt alles ab, was seine eigene
 * coach_id trägt, und Slots wie Sätze hängen daran. Gefehlt hat nicht
 * das Recht, sondern die Angabe, WER eingetragen hat.
 *
 * Die Prüfung unten ist trotzdem nötig: Die Zeilensicherheit verhindert
 * das Schreiben auf fremde Klienten, würde aber eine Einheit ohne
 * Zusammenhang zulassen, wenn die clientId nicht zum Coach gehört. Beim
 * ersten Zugriff fällt das auf — hier fällt es sofort auf, mit einer
 * Meldung, die etwas sagt.
 */
export async function trackSessionAction(
  clientId: string,
  slots: TrackedSlotInput[],
  title: string,
  origin: {
    planId?: string | null;
    planDayId?: string | null;
    durationSeconds?: number | null;
    isComplete?: boolean;
  } = {},
): Promise<TrackResult> {
  if (slots.length === 0) {
    return { ok: false, error: "Keine Übung eingetragen." };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: client } = await db
    .from("clients")
    .select("id, coach_id, organisation_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { ok: false, error: "Klient nicht gefunden." };
  if (client.coach_id !== user.id) {
    return { ok: false, error: "Dieser Klient gehört nicht zu dir." };
  }

  const { data: session, error: sessionError } = await db
    .from("sessions")
    .insert({
      client_id: client.id,
      coach_id: user.id,
      organisation_id: client.organisation_id,
      plan_id: origin.planId ?? null,
      plan_day_id: origin.planDayId ?? null,
      // Folgt einem Plantag = nicht frei trainiert. Zwei verschiedene
      // Dinge: `is_self_directed` meint den fehlenden Plan, `recorded_by`
      // meint, wer getippt hat.
      is_self_directed: !origin.planDayId,
      // Das Neue: Diese Einheit hat der Trainer erfasst.
      recorded_by: user.id,
      duration_seconds:
        origin.durationSeconds != null
          ? Math.min(Math.max(origin.durationSeconds, 0), 43_200)
          : null,
      is_complete: origin.isComplete ?? true,
      title: title.trim() || "Training",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return {
      ok: false,
      error: sessionError?.message ?? "Speichern fehlgeschlagen.",
    };
  }

  for (const [index, slot] of slots.entries()) {
    const { data: row, error: slotError } = await db
      .from("session_slots")
      .insert({
        session_id: session.id,
        plan_slot_id: slot.planSlotId ?? null,
        pattern: slot.pattern,
        muscle_group: slot.muscleGroup,
        block: slot.block,
        exercise_id: slot.exerciseId,
        position: index + 1,
      })
      .select("id")
      .single();

    if (slotError || !row) {
      // Halbe Einheit wieder entfernen — sie würde die Auswertung
      // verfälschen und niemand könnte sie zuordnen.
      await db.from("sessions").delete().eq("id", session.id);
      return {
        ok: false,
        error: slotError?.message ?? "Übung konnte nicht gespeichert werden.",
      };
    }

    const sets = slot.sets
      .filter((s) => s.reps > 0)
      .map((s, i) => ({
        session_slot_id: row.id,
        set_number: i + 1,
        weight_kg: s.isBodyweight ? 0 : Math.max(0, s.weightKg),
        body_load_kg:
          s.bodyLoadKg === null || s.bodyLoadKg < 0
            ? null
            : Math.min(400, Math.round(s.bodyLoadKg * 100) / 100),
        reps: s.reps,
        is_bodyweight: s.isBodyweight,
        rir:
          s.rir == null || s.rir < 0 || s.rir > 10 ? null : Math.round(s.rir),
      }));

    if (sets.length > 0) {
      const { error: setError } = await db.from("session_sets").insert(sets);
      if (setError) {
        await db.from("sessions").delete().eq("id", session.id);
        return { ok: false, error: setError.message };
      }
    }
  }

  revalidatePath("/coach/clients");
  revalidatePath(`/coach/clients/${client.id}`);
  revalidatePath("/athlete");
  revalidatePath("/athlete/progress");
  return { ok: true, id: session.id };
}
