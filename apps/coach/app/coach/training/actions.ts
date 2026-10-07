"use server";

import { revalidatePath } from "next/cache";
import type { ExperienceLevel } from "@ptfive/types";
import { createServerSupabase } from "@/lib/supabase-server";
import { getT } from "@/app/i18n/server";
import { dbFehler } from "@/app/i18n/db-fehler";

/**
 * Programme: Pläne ohne Klienten (Tabelle `templates`, seit 0028 mit
 * Vorlagen aus der App).
 *
 * Jede schreibende Action liest zurück, ob sie gewirkt hat
 * (`.select("id")`). Die Zeilensicherheit lässt eine App-Vorlage nicht
 * ändern — ein `update` darauf ändert null Zeilen und meldet Erfolg.
 * Ohne Rücklesen sähe der Trainer „gespeichert" und nichts wäre
 * passiert. Regel 3.
 */

export type IdResult = { ok: true; id: string } | { ok: false; error: string };
export type ProgramResult = { ok: true } | { ok: false; error: string };

function refresh(id?: string) {
  revalidatePath("/coach/training");
  if (id) revalidatePath(`/coach/training/programs/${id}`);
}

export async function createProgramAction(input: {
  name: string;
  level: ExperienceLevel;
  dayTitles: string[];
}): Promise<IdResult> {
  const t = getT();
  const name = input.name.trim();
  if (name === "") return { ok: false, error: t.coach.planErrors.planName };
  const titles = input.dayTitles.map((d) => d.trim()).filter((d) => d !== "");
  if (titles.length === 0) return { ok: false, error: t.coach.planErrors.oneDay };

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  const { data: tpl, error } = await db
    .from("templates")
    .insert({ coach_id: user.id, name, level: input.level, is_system: false })
    .select("id")
    .single();
  if (error || !tpl) {
    return { ok: false, error: error?.message ?? t.coach.planErrors.planNotCreated };
  }

  const { data: tage, error: dayError } = await db
    .from("plan_days")
    .insert(titles.map((title, i) => ({ template_id: tpl.id, position: i + 1, title })))
    .select("id");
  if (dayError || (tage ?? []).length !== titles.length) {
    // Ein Programm ohne seine Tage ist schlimmer als keines — wieder weg.
    await db.from("templates").delete().eq("id", tpl.id);
    return { ok: false, error: dayError?.message ?? t.coach.planErrors.planNotCreated };
  }

  refresh();
  return { ok: true, id: tpl.id as string };
}

export async function updateProgramAction(
  id: string,
  patch: { name?: string; level?: ExperienceLevel },
): Promise<ProgramResult> {
  const t = getT();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name === "") return { ok: false, error: t.coach.planErrors.nameEmpty };
    update.name = name;
  }
  if (patch.level !== undefined) update.level = patch.level;

  const db = createServerSupabase();
  const { data, error } = await db
    .from("templates")
    .update(update)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: t.coach.programs.notYours };

  refresh(id);
  return { ok: true };
}

export async function deleteProgramAction(id: string): Promise<ProgramResult> {
  const t = getT();
  const db = createServerSupabase();
  // Zugewiesene Pläne bleiben: plans.template_id ist „on delete set null".
  const { data, error } = await db.from("templates").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: t.coach.programs.notYours };
  refresh();
  return { ok: true };
}

/** App-Vorlage (oder eigenes Programm) als eigenes, bearbeitbares kopieren. */
export async function copyProgramAction(id: string, name?: string): Promise<IdResult> {
  const t = getT();
  const db = createServerSupabase();
  const { data, error } = await db.rpc("copy_template", {
    p_template: id,
    p_name: name ?? null,
  });
  if (error) return { ok: false, error: dbFehler(t, error.message) };
  if (!data) return { ok: false, error: t.fehler.db.programIncomplete };
  refresh();
  return { ok: true, id: data as string };
}

/** Programm als neuen aktiven Plan zu einem Klienten kopieren. */
export async function assignProgramAction(input: {
  programId: string;
  clientId: string;
  startsOn: string;
}): Promise<IdResult> {
  const t = getT();
  const db = createServerSupabase();
  const { data, error } = await db.rpc("assign_template", {
    p_template: input.programId,
    p_client: input.clientId,
    p_starts_on: input.startsOn,
  });
  if (error) return { ok: false, error: dbFehler(t, error.message) };
  if (!data) return { ok: false, error: t.fehler.db.programIncomplete };
  revalidatePath(`/coach/clients/${input.clientId}`);
  revalidatePath("/athlete");
  revalidatePath("/athlete/plan");
  return { ok: true, id: data as string };
}
