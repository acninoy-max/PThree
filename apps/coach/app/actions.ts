"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Schreibende Vorgänge.
 *
 * Alle laufen als angemeldeter Nutzer, damit Row Level Security greift.
 * Es gibt hier bewusst keine eigenen Berechtigungsprüfungen — die Datenbank
 * lehnt ab, was nicht erlaubt ist. Zwei Prüfstellen wären zwei Stellen, an
 * denen sie auseinanderlaufen können.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createClientAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const fullName = String(form.get("fullName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const level = String(form.get("level") ?? "beginner");
  // Leer heisst leer, nicht 1970: Ein leeres Datumsfeld schickt "".
  const birthDate = String(form.get("birthDate") ?? "").trim();
  const goal = String(form.get("goal") ?? "").trim();

  if (fullName.length < 2) {
    return { ok: false, error: "Bitte einen Namen eingeben." };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  // organisation_id vom Coach übernehmen — sonst fehlt die Kette später
  // in den QA-Auswertungen.
  const { data: coach } = await db
    .from("coaches")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await db.from("clients").insert({
    coach_id: user.id,
    organisation_id: coach?.organisation_id ?? null,
    full_name: fullName,
    email: email || null,
    birth_date: birthDate || null,
    level,
    goal: goal || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/clients");
  revalidatePath("/coach");
  redirect("/coach/clients");
}

export async function updateClientAction(
  clientId: string,
  form: FormData,
): Promise<ActionResult> {
  const db = createServerSupabase();

  const patch: Record<string, unknown> = {};
  const fullName = form.get("fullName");
  const goal = form.get("goal");
  const level = form.get("level");
  const status = form.get("status");
  const email = form.get("email");
  const birthDate = form.get("birthDate");

  if (typeof fullName === "string" && fullName.trim()) {
    patch.full_name = fullName.trim();
  }
  if (typeof goal === "string") patch.goal = goal.trim() || null;
  if (typeof level === "string") patch.level = level;
  if (typeof status === "string") patch.status = status;
  if (typeof email === "string") patch.email = email.trim() || null;
  // Leeres Feld = kein Datum. Ohne diese Zeile schickt der Browser ""
  // und Postgres lehnt es als ungueltiges Datum ab.
  if (typeof birthDate === "string") {
    patch.birth_date = birthDate.trim() || null;
  }

  const { error } = await db.from("clients").update(patch).eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/coach/clients");
  return { ok: true };
}

/**
 * Löscht einen Klienten samt aller Daten.
 *
 * Durch die Fremdschlüssel-Kaskaden verschwinden dabei auch Einheiten, Sätze,
 * Termine, Check-ins, Körperwerte, Nachrichten und Pläne. Das ist so gewollt:
 * Bei Gesundheitsdaten nach Art. 9 DSGVO muss eine Löschung vollständig sein,
 * keine Karteileiche.
 *
 * Nicht gelöscht wird das Anmeldekonto des Athleten — das gehört ihm, nicht
 * dem Coach. Er verliert nur die Verknüpfung.
 */
export async function deleteClientAction(
  clientId: string,
): Promise<ActionResult> {
  const db = createServerSupabase();

  const { error } = await db.from("clients").delete().eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/clients");
  revalidatePath("/coach");
  return { ok: true };
}

// ---------- Termine ----------

export interface AppointmentInput {
  clientId: string;
  /** Lokale Datums- und Zeitangabe aus dem Formular, z. B. "2026-08-22T09:00". */
  startsAtLocal: string;
  durationMinutes: number;
  location: "gym" | "park" | "home" | "online";
  locationNote?: string;
  notes?: string;
  /** Wochentage 1–7 für Serientermine; leer = einmalig. */
  repeatWeekdays?: number[];
  /** Über wie viele Wochen die Serie läuft. */
  repeatWeeks?: number;
}

/**
 * Legt einen Termin an — optional als Serie.
 *
 * Serientermine werden als einzelne Zeilen geschrieben statt als Regel, die
 * beim Lesen aufgelöst wird. Klingt umständlicher, ist aber richtig: Jeder
 * Termin kann eigenständig verschoben oder als No-Show markiert werden, und
 * genau das passiert im PT-Alltag ständig.
 */
export async function createAppointmentAction(
  input: AppointmentInput,
): Promise<ActionResult> {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const start = new Date(input.startsAtLocal);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "Ungültiger Zeitpunkt." };
  }

  const { data: client } = await db
    .from("clients")
    .select("organisation_id")
    .eq("id", input.clientId)
    .maybeSingle();

  const weekdays = input.repeatWeekdays ?? [];
  const weeks = Math.min(Math.max(input.repeatWeeks ?? 1, 1), 26);

  const starts: Date[] = [];
  if (weekdays.length === 0) {
    starts.push(start);
  } else {
    // Von der Woche des Startdatums aus die gewählten Wochentage füllen.
    const monday = new Date(start);
    monday.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    for (let w = 0; w < weeks; w++) {
      for (const wd of weekdays) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + w * 7 + (wd - 1));
        d.setHours(start.getHours(), start.getMinutes(), 0, 0);
        if (d >= start) starts.push(d);
      }
    }
  }

  if (starts.length === 0) {
    return { ok: false, error: "Keine Termine im gewählten Zeitraum." };
  }

  const rows = starts
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => ({
      coach_id: user.id,
      client_id: input.clientId,
      organisation_id: client?.organisation_id ?? null,
      starts_at: d.toISOString(),
      duration_minutes: input.durationMinutes,
      location: input.location,
      location_note: input.locationNote?.trim() || null,
      notes: input.notes?.trim() || null,
      recurrence_rule: weekdays.length ? `weekly:${weekdays.join(",")}` : null,
    }));

  const { error } = await db.from("appointments").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/schedule");
  revalidatePath("/coach/clients");
  revalidatePath("/coach");
  revalidatePath(`/coach/clients/${input.clientId}`);
  return { ok: true };
}

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: "scheduled" | "completed" | "rescheduled" | "cancelled" | "no_show",
): Promise<ActionResult> {
  const db = createServerSupabase();
  const { error } = await db
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/schedule");
  revalidatePath("/coach");
  return { ok: true };
}

export async function deleteAppointmentAction(
  appointmentId: string,
): Promise<ActionResult> {
  const db = createServerSupabase();
  const { error } = await db
    .from("appointments")
    .delete()
    .eq("id", appointmentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/schedule");
  revalidatePath("/coach");
  return { ok: true };
}

/**
 * Antwort des Coaches auf ein Check-in.
 *
 * coach_replied_at wird nicht mitgeschickt: Der Trigger check_ins_guard
 * setzt den Zeitstempel selbst. So kann der Zeitpunkt nicht behauptet,
 * sondern nur erzeugt werden — wichtig, weil daraus später die
 * Antwortgeschwindigkeit im Ketten-Reporting wird.
 */
export async function replyToCheckInAction(
  checkInId: string,
  reply: string,
): Promise<ActionResult> {
  const text = reply.trim();
  if (text === "") return { ok: false, error: "Die Antwort ist leer." };

  const db = createServerSupabase();
  const { error } = await db
    .from("check_ins")
    .update({ coach_reply: text })
    .eq("id", checkInId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/checkins");
  revalidatePath("/coach");
  return { ok: true };
}

/**
 * Was das Check-in dieses Klienten abfragt.
 *
 * `upsert` statt `update`: Für Klienten aus der Zeit vor Migration 0007
 * gibt es womöglich noch keine Konfigurationszeile.
 */
export async function updateCheckInConfigAction(
  clientId: string,
  fields: {
    askWeight: boolean;
    askEnergy: boolean;
    askSleep: boolean;
    askStress: boolean;
    askFreeText: boolean;
    askShoulders: boolean;
    askChest: boolean;
    askWaist: boolean;
    askArm: boolean;
    askThigh: boolean;
    measureEveryWeeks: number;
  },
): Promise<ActionResult> {
  if (fields.measureEveryWeeks < 1 || fields.measureEveryWeeks > 26) {
    return {
      ok: false,
      error: "Der Rhythmus muss zwischen 1 und 26 Wochen liegen.",
    };
  }

  const db = createServerSupabase();
  const { error } = await db.from("check_in_configs").upsert(
    {
      client_id: clientId,
      ask_weight: fields.askWeight,
      ask_energy: fields.askEnergy,
      ask_sleep: fields.askSleep,
      ask_stress: fields.askStress,
      ask_free_text: fields.askFreeText,
      ask_shoulders: fields.askShoulders,
      ask_chest: fields.askChest,
      ask_waist: fields.askWaist,
      ask_arm: fields.askArm,
      ask_thigh: fields.askThigh,
      measure_every_weeks: fields.measureEveryWeeks,
    },
    { onConflict: "client_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/athlete/checkin");
  return { ok: true };
}

export type InviteResult =
  { ok: true; url: string } | { ok: false; error: string };

/** Erzeugt einen Einladungslink; ältere offene Links werden ungültig. */
export async function createInviteAction(
  clientId: string,
): Promise<InviteResult> {
  const db = createServerSupabase();
  const { data, error } = await db.rpc("create_client_invite", {
    target_client: clientId,
    valid_days: 14,
  });

  if (error) return { ok: false, error: error.message };

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  revalidatePath(`/coach/clients/${clientId}`);
  return { ok: true, url: `${base}/invite/${data as string}` };
}

export type UnlinkResult =
  { ok: true; hinweis: string } | { ok: false; error: string };

/**
 * Löst den App-Zugang vom Klienten.
 *
 * Der Fall aus dem Testlauf: Jemand meldet sich mit der falschen Adresse
 * an. Bis 0024 war der Klient damit für immer an dieses Konto gebunden —
 * ein zweiter Einladungslink lief still ins Leere, weil die Funktion
 * einen bereits vergebenen Klienten nicht überschreibt.
 *
 * Die Historie bleibt. Getrennt wird nur die Verbindung zu `auth.users`;
 * der Klientendatensatz mit Plänen, Einheiten und Check-ins steht
 * unberührt da und wartet auf die nächste Einladung.
 *
 * Das alte Login-Konto bleibt ebenfalls bestehen — es gehört dem
 * Menschen, nicht dem Trainer. Es hat danach nur keinen Klienten mehr.
 */
export async function unlinkClientAction(
  clientId: string,
): Promise<UnlinkResult> {
  const db = createServerSupabase();
  const { data, error } = await db.rpc("unlink_client", {
    target_client: clientId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coach/clients/${clientId}`);
  return { ok: true, hinweis: data as string };
}
