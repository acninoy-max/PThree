"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import type {
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export interface LoggedSetInput {
  /** Zusatzgewicht. Bei Hantelübungen die ganze Last. */
  weightKg: number;
  /**
   * Bewegter Körperanteil in Kilogramm, festgehalten zum Zeitpunkt des
   * Satzes. null = unbekannt, dann zählt nur `weightKg`.
   */
  bodyLoadKg: number | null;
  reps: number;
  isBodyweight: boolean;
  /** Reps in Reserve: wie viele wären noch gegangen. 0 = bis zum Versagen. */
  rir?: number | null;
}

export interface LoggedSlotInput {
  /** null bei Rumpfarbeit — die läuft bewusst ohne Musterkurve. */
  pattern: MovementPattern | null;
  /**
   * Womit der Satz verbucht wird. Festgehalten statt später aus der
   * Übung gelesen: Sortiert jemand die Bibliothek um, soll das die
   * Historie nicht rückwirkend umschreiben.
   */
  muscleGroup: MuscleGroup | null;
  block: TrainingBlock;
  exerciseId: string;
  /** Herkunft im Plan; null bei frei hinzugefügten Übungen. */
  planSlotId?: string | null;
  sets: LoggedSetInput[];
}

/** Woher die Einheit stammt. Fehlt beides, war es freies Training. */
export interface SessionOrigin {
  planId?: string | null;
  planDayId?: string | null;
  /** Aus der mitlaufenden Uhr. */
  durationSeconds?: number | null;
  /** false, wenn geplante Sätze leer geblieben sind. */
  isComplete?: boolean;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Speichert eine Trainingseinheit des Athleten.
 *
 * Frei geloggt, ohne Plan — is_self_directed bleibt trotzdem false, solange
 * ein Coach betreut. Die Musterhistorie zählt beides gleichwertig, genau
 * darum bricht die Kurve nie ab.
 */
export async function saveSessionAction(
  slots: LoggedSlotInput[],
  title: string,
  origin: SessionOrigin = {},
): Promise<SaveResult> {
  if (slots.length === 0) {
    return { ok: false, error: "Keine Übung erfasst." };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: client } = await db
    .from("clients")
    .select("id, coach_id, organisation_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!client) {
    return { ok: false, error: "Kein Klientenprofil gefunden." };
  }

  const { data: session, error: sessionError } = await db
    .from("sessions")
    .insert({
      client_id: client.id,
      coach_id: client.coach_id,
      organisation_id: client.organisation_id,
      plan_id: origin.planId ?? null,
      plan_day_id: origin.planDayId ?? null,
      // Obergrenze wie der Datenbank-Check: 12 Stunden. Eine vergessene
      // Uhr soll die Auswertung nicht verzerren.
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

  // Slots und Sätze anlegen. Bei einem Fehler die halbe Einheit wieder
  // entfernen — eine Einheit ohne Sätze verfälscht sonst die Auswertung.
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
        // Negatives Zusatzgewicht wäre eine Falscheingabe und würde die
        // wirksame Last unter das Körpergewicht drücken.
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

  revalidatePath("/athlete");
  revalidatePath("/athlete/progress");
  return { ok: true };
}

export interface CheckInInput {
  /** Montag der Woche, für die das Check-in gilt. */
  weekOf: string;
  weightKg: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  clientNote: string;
  /** Körpermaße in Zentimetern, alle optional. */
  shouldersCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

/** Grenzen wie die Datenbank-Constraints, nur mit lesbarer Meldung. */
const CM_RANGE: Record<string, [number, number, string]> = {
  shouldersCm: [50, 250, "Schultern"],
  chestCm: [50, 250, "Brust"],
  waistCm: [40, 250, "Taille"],
  armCm: [15, 100, "Oberarm"],
  thighCm: [25, 150, "Oberschenkel"],
};

/**
 * Speichert das wöchentliche Check-in des Athleten.
 *
 * Ein Check-in pro Klient und Woche — die Eindeutigkeit erzwingt die
 * Datenbank, hier wird deshalb bewusst per upsert gearbeitet. Nachträgliches
 * Korrigieren ist erlaubt und ändert submitted_at nicht: Das Datum sagt aus,
 * wann geantwortet wurde, nicht wann zuletzt getippt.
 *
 * coach_reply wird hier nie geschrieben — der Trigger check_ins_guard würde
 * es ohnehin ablehnen.
 */
export async function saveCheckInAction(
  input: CheckInInput,
): Promise<SaveResult> {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: client } = await db
    .from("clients")
    .select("id, coach_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!client) return { ok: false, error: "Kein Klientenprofil gefunden." };

  const scale = (v: number | null) =>
    v === null || v < 1 || v > 5 ? null : Math.round(v);

  const note = input.clientNote.trim();
  const weight =
    input.weightKg === null || Number.isNaN(input.weightKg)
      ? null
      : Math.round(input.weightKg * 100) / 100;

  if (weight !== null && (weight < 25 || weight > 350)) {
    return { ok: false, error: "Das Gewicht sieht nicht plausibel aus." };
  }

  const cm = (key: keyof typeof CM_RANGE): number | null => {
    const raw = input[key as keyof CheckInInput] as number | null | undefined;
    if (raw === null || raw === undefined || Number.isNaN(raw)) return null;
    return Math.round(raw * 10) / 10;
  };

  for (const key of Object.keys(CM_RANGE)) {
    const value = cm(key);
    if (value === null) continue;
    const [min, max, label] = CM_RANGE[key]!;
    if (value < min || value > max) {
      return {
        ok: false,
        error: `${label}: ${value} cm sieht nicht plausibel aus.`,
      };
    }
  }

  // Gibt es die Zeile schon, bleibt der ursprüngliche Abschickzeitpunkt.
  const { data: existing } = await db
    .from("check_ins")
    .select("id, submitted_at")
    .eq("client_id", client.id)
    .eq("week_of", input.weekOf)
    .maybeSingle();

  const payload = {
    client_id: client.id,
    coach_id: client.coach_id,
    week_of: input.weekOf,
    submitted_at: existing?.submitted_at ?? new Date().toISOString(),
    weight_kg: weight,
    energy: scale(input.energy),
    sleep: scale(input.sleep),
    stress: scale(input.stress),
    client_note: note === "" ? null : note,
    shoulders_cm: cm("shouldersCm"),
    chest_cm: cm("chestCm"),
    waist_cm: cm("waistCm"),
    arm_cm: cm("armCm"),
    thigh_cm: cm("thighCm"),
  };

  const { error } = existing
    ? await db.from("check_ins").update(payload).eq("id", existing.id)
    : await db.from("check_ins").insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/athlete");
  revalidatePath("/athlete/checkin");
  return { ok: true };
}

// ---------- Fortschrittsauswahl ----------

/**
 * Welche Übungen der Athlet auf seiner Fortschrittsseite sehen will.
 *
 * Die ganze Liste auf einmal, nicht einzelne Umschalter: Zwei Klicks kurz
 * hintereinander gingen sonst beide vom selben alten Stand aus und der
 * zweite überschriebe den ersten. Dieselbe Überlegung wie bei den
 * Wochentagen am Plantag.
 */
export async function setProgressSelectionAction(
  exerciseIds: string[],
): Promise<SimpleResult> {
  // Obergrenze, weil die Seite sonst wieder unlesbar wird — genau das
  // Problem, das die Auswahl lösen soll.
  if (exerciseIds.length > 8) {
    return { ok: false, error: "Höchstens acht Übungen auf einmal." };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!client) return { ok: false, error: "Kein Klientenprofil gefunden." };

  const sauber = [...new Set(exerciseIds)];

  // Erst leeren, dann neu schreiben. Ein Abgleich wäre sparsamer, aber
  // er müsste Reihenfolgen verschieben — und das ist die Sorte Code, in
  // der sich Fehler verstecken, die niemand bemerkt.
  const { error: delError } = await db
    .from("progress_selections")
    .delete()
    .eq("client_id", client.id)
    // Nur die eigene Liste. Die des Trainers bleibt unberührt.
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

  revalidatePath("/athlete/progress");
  return { ok: true };
}
