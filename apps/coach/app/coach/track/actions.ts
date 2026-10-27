"use server";

import { revalidatePath } from "next/cache";
import type {
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";
import { getT } from "@/app/i18n/server";
import { dbFehler } from "@/app/i18n/db-fehler";
import type { Dict } from "@/app/i18n";

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
  const t = getT();
  if (slots.length === 0) {
    return { ok: false, error: t.coach.planErrors.noExerciseEntered };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  const { data: client } = await db
    .from("clients")
    .select("id, coach_id, organisation_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { ok: false, error: t.coach.planErrors.clientNotFound };
  if (client.coach_id !== user.id) {
    return { ok: false, error: t.coach.planErrors.notYourClient };
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
      title: title.trim() || t.fehler.action.defaultSessionTitle,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return {
      ok: false,
      error: sessionError?.message ?? t.fehler.action.saveFailed,
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
        error: slotError?.message ?? t.fehler.action.exerciseNotSaved,
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

export type NoteResult = { ok: true; note: string | null } | { ok: false; error: string };

/**
 * Notiz je Klient und Übung speichern (0031). Leer = löschen.
 *
 * Danach wird nachgelesen, was wirklich in der Datenbank steht — eine
 * Notiz wie „Handgelenk ab 120 kg", die nur scheinbar gespeichert ist,
 * ist schlimmer als keine.
 */
export async function saveExerciseNoteAction(
  clientId: string,
  exerciseId: string,
  note: string,
): Promise<NoteResult> {
  const t = getT();
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  const text = note.trim();
  if (text.length > 500) return { ok: false, error: t.coach.track.noteTooLong };

  if (text === "") {
    const { error } = await db
      .from("client_exercise_notes")
      .delete()
      .eq("client_id", clientId)
      .eq("exercise_id", exerciseId)
      .eq("coach_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("client_exercise_notes").upsert(
      { client_id: clientId, exercise_id: exerciseId, coach_id: user.id, note: text },
      { onConflict: "client_id,exercise_id,coach_id" },
    );
    if (error) return { ok: false, error: error.message };
  }

  const { data: da, error: leseFehler } = await db
    .from("client_exercise_notes")
    .select("note")
    .eq("client_id", clientId)
    .eq("exercise_id", exerciseId)
    .eq("coach_id", user.id)
    .maybeSingle();
  if (leseFehler) return { ok: false, error: leseFehler.message };
  const ist = (da?.note as string | undefined) ?? null;
  if (ist !== (text === "" ? null : text)) {
    return { ok: false, error: t.coach.track.noteNotSaved };
  }

  revalidatePath(`/coach/track/${clientId}`);
  return { ok: true, note: ist };
}

export type ConfirmResult = { ok: true; confirmedAt: string } | { ok: false; error: string };

/**
 * Einheit bestätigen (0033). Danach ist sie gesperrt.
 *
 * Den Zeitpunkt setzt die Datenbank (Trigger), der Wert hier ist nur das
 * Signal. Nachgelesen wird, ob wirklich ein Zeitpunkt dasteht — ein
 * `update`, das die Zeilensicherheit ausfiltert, meldet sonst Erfolg.
 */
export async function confirmSessionAction(
  sessionId: string,
  clientId: string,
): Promise<ConfirmResult> {
  const t = getT();
  const db = createServerSupabase();
  const { data, error } = await db
    .from("sessions")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("confirmed_at");
  if (error) return { ok: false, error: dbFehler(t, error.message) };
  const zeit = data?.[0]?.confirmed_at as string | null | undefined;
  if (!zeit) return { ok: false, error: t.coach.track.confirmFailed };

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/athlete/plan");
  return { ok: true, confirmedAt: zeit };
}
