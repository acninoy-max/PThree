"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getT } from "@/app/i18n/server";
import { dbFehler, dbHinweis } from "@/app/i18n/db-fehler";
import { montagVon, plusTage, tagISO, zeitpunkt } from "@/app/zone";

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
  const t = getT();
  const fullName = String(form.get("fullName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const level = String(form.get("level") ?? "beginner");
  // Leer heisst leer, nicht 1970: Ein leeres Datumsfeld schickt "".
  const birthDate = String(form.get("birthDate") ?? "").trim();
  const goal = String(form.get("goal") ?? "").trim();
  const coachingType = String(form.get("coachingType") ?? "personal");

  if (fullName.length < 2) {
    return { ok: false, error: t.coach.actions.nameMissing };
  }

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  // organisation_id vom Coach übernehmen — sonst fehlt die Kette später
  // in den QA-Auswertungen.
  const { data: coach } = await db
    .from("coaches")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: angelegt, error } = await db
    .from("clients")
    .insert({
      coach_id: user.id,
      organisation_id: coach?.organisation_id ?? null,
      full_name: fullName,
      email: email || null,
      birth_date: birthDate || null,
      level,
      coaching_type: ["personal", "online", "hybrid"].includes(coachingType)
        ? coachingType
        : "personal",
      goal: goal || null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  // Ohne zurückgelesene Zeile wissen wir nicht, wohin — und ob überhaupt
  // etwas angelegt wurde. Lieber sagen als auf eine leere Seite leiten.
  if (!angelegt) {
    return { ok: false, error: t.coach.actions.clientNotCreated };
  }

  revalidatePath("/coach/clients");
  revalidatePath("/coach");
  // Direkt in die Akte (Joëls Test vom 01.10., Punkt 2). Dort zeigt
  // `?neu=1` die Karte „Nächste Schritte" — seit 20.10. statt des
  // Plan-Dialogs, der sich ungefragt öffnete.
  redirect(`/coach/clients/${angelegt.id}?neu=1`);
}

export async function updateClientAction(
  clientId: string,
  form: FormData,
): Promise<ActionResult> {
  const t = getT();
  const db = createServerSupabase();

  const patch: Record<string, unknown> = {};
  const fullName = form.get("fullName");
  const goal = form.get("goal");
  const level = form.get("level");
  const status = form.get("status");
  const email = form.get("email");
  const birthDate = form.get("birthDate");
  const coachingType = form.get("coachingType");

  if (typeof fullName === "string" && fullName.trim()) {
    patch.full_name = fullName.trim();
  }
  if (typeof goal === "string") patch.goal = goal.trim() || null;
  if (typeof level === "string") patch.level = level;
  if (typeof status === "string") patch.status = status;
  if (typeof email === "string") patch.email = email.trim() || null;
  if (typeof coachingType === "string" && ["personal", "online", "hybrid"].includes(coachingType)) {
    patch.coaching_type = coachingType;
  }
  // Leeres Feld = kein Datum. Ohne diese Zeile schickt der Browser ""
  // und Postgres lehnt es als ungueltiges Datum ab.
  if (typeof birthDate === "string") {
    patch.birth_date = birthDate.trim() || null;
  }

  // Zurücklesen: Ein update, das die Zeilensicherheit ausfiltert, meldet
  // sonst Erfolg (Regel 3).
  const { data: geaendert, error } = await db
    .from("clients")
    .update(patch)
    .eq("id", clientId)
    .select("id");
  if (error) return { ok: false, error: dbFehler(t, error.message) };
  if (!geaendert || geaendert.length !== 1) {
    return { ok: false, error: t.coach.actions.clientNotSaved };
  }

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
  const t = getT();
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
  const t = getT();
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  // In Amsterdam gelesen, nicht in der Zone des Servers (UTC) — sonst
  // wird aus 06:00 ein Termin um 08:00 (Fehler vom 27.10.2026, zone.ts).
  const [datum = "", uhrzeit = ""] = input.startsAtLocal.split("T");
  const start = zeitpunkt(datum, uhrzeit);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: t.coach.actions.invalidTime };
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
    // Jeder Tag einzeln über zeitpunkt(): Eine Serie über die
    // Zeitumstellung bleibt so um 06:00, statt eine Stunde zu springen.
    const montag = montagVon(datum);
    for (let w = 0; w < weeks; w++) {
      for (const wd of weekdays) {
        const d = zeitpunkt(plusTage(montag, w * 7 + (wd - 1)), uhrzeit);
        if (d >= start) starts.push(d);
      }
    }
  }

  if (starts.length === 0) {
    return { ok: false, error: t.coach.actions.noAppointmentsInRange };
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

  const { data: angelegt, error } = await db.from("appointments").insert(rows).select("id");
  if (error) return { ok: false, error: error.message };
  // Nachzählen: Eine Serie, von der nur ein Teil ankommt, darf nicht als
  // Erfolg durchgehen (Regel 3).
  if ((angelegt?.length ?? 0) !== rows.length) {
    return { ok: false, error: t.coach.actions.appointmentsIncomplete };
  }

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
  const t = getT();
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
  const t = getT();
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
  const t = getT();
  const text = reply.trim();
  if (text === "") return { ok: false, error: t.coach.actions.replyEmpty };

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
    weightEveryWeeks: number;
    wellbeingEveryWeeks: number;
  },
): Promise<ActionResult> {
  const t = getT();
  const rhythmen = [fields.measureEveryWeeks, fields.weightEveryWeeks, fields.wellbeingEveryWeeks];
  if (rhythmen.some((w) => !Number.isInteger(w) || w < 1 || w > 26)) {
    return {
      ok: false,
      error: t.coach.actions.rhythmRange,
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
      // Spalten aus 0034. Immer mitschicken — „nur wenn nicht Standard"
      // hätte ein Zurückstellen auf jede Woche still verschluckt.
      weight_every_weeks: fields.weightEveryWeeks,
      wellbeing_every_weeks: fields.wellbeingEveryWeeks,
    },
    { onConflict: "client_id" },
  );
  if (error) return { ok: false, error: dbFehler(t, error.message) };

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
  const t = getT();
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
  const t = getT();
  const db = createServerSupabase();
  const { data, error } = await db.rpc("unlink_client", {
    target_client: clientId,
  });

  if (error) return { ok: false, error: dbFehler(t, error.message) };

  revalidatePath(`/coach/clients/${clientId}`);
  return { ok: true, hinweis: dbHinweis(t, data as string) };
}

// ---------- Check-in durch den Trainer (0034) ----------

export interface CoachCheckInInput {
  weightKg: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  /** Spaltenname → Zentimeter. Nur ausgefüllte Maße. */
  measures: Partial<Record<"shoulders_cm" | "chest_cm" | "waist_cm" | "arm_cm" | "thigh_cm", number>>;
}

export type CoachCheckInResult =
  | { ok: true; kept: number }
  | { ok: false; error: string };

const CM_GRENZEN: Record<keyof CoachCheckInInput["measures"], [number, number]> = {
  shoulders_cm: [50, 250],
  chest_cm: [50, 250],
  waist_cm: [40, 250],
  arm_cm: [15, 100],
  thigh_cm: [25, 150],
};

/**
 * Der Trainer trägt das Check-in dieser Woche ein — im Studio, mit
 * Waage und Maßband (Meeting 27.10.).
 *
 * Dieselben Regeln wie der Trigger guard_check_in_columns (0034), damit
 * der Trainer eine Erklärung bekommt statt einer Datenbankmeldung:
 *   - noch keine Zeile diese Woche: wird seine, er trägt alles ein
 *   - seine eigene Zeile: er darf alles ändern
 *   - Zeile des Klienten: nur LEERE Maße ergänzen; alles andere bleibt,
 *     wie der Klient es angegeben hat (`kept` zählt, was liegen blieb)
 */
export async function saveCoachCheckInAction(
  clientId: string,
  input: CoachCheckInInput,
): Promise<CoachCheckInResult> {
  const t = getT();
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  if (input.weightKg !== null && (input.weightKg < 25 || input.weightKg > 350)) {
    return { ok: false, error: t.fehler.action.weightImplausible };
  }
  for (const [spalte, wert] of Object.entries(input.measures)) {
    const [min, max] = CM_GRENZEN[spalte as keyof typeof CM_GRENZEN];
    if (wert === undefined || wert < min || wert > max) {
      return { ok: false, error: t.coach.checkinEntry.cmRange };
    }
  }
  const skala = (v: number | null) => (v === null || v < 1 || v > 5 ? null : Math.round(v));

  // Woche nach Amsterdam, wie überall (zone.ts).
  const woche = montagVon(tagISO(new Date()));
  const { data: vorhanden, error: leseFehler } = await db
    .from("check_ins")
    .select("*")
    .eq("client_id", clientId)
    .eq("week_of", woche)
    .maybeSingle();
  if (leseFehler) return { ok: false, error: dbFehler(t, leseFehler.message) };

  const alles: Record<string, unknown> = {
    weight_kg: input.weightKg === null ? null : Math.round(input.weightKg * 100) / 100,
    energy: skala(input.energy),
    sleep: skala(input.sleep),
    stress: skala(input.stress),
    ...input.measures,
  };

  let ergebnis;
  let liegenGeblieben = 0;
  if (!vorhanden) {
    ergebnis = await db
      .from("check_ins")
      .insert({
        client_id: clientId,
        coach_id: user.id,
        week_of: woche,
        submitted_at: new Date().toISOString(),
        ...alles,
      })
      .select("id");
  } else if (vorhanden.entered_by === user.id) {
    ergebnis = await db.from("check_ins").update(alles).eq("id", vorhanden.id).select("id");
  } else {
    // Zeile des Klienten: nur leere Maße ergänzen.
    const ergaenzen: Record<string, number> = {};
    for (const [spalte, wert] of Object.entries(input.measures)) {
      if (wert === undefined) continue;
      if (vorhanden[spalte] === null || vorhanden[spalte] === undefined) ergaenzen[spalte] = wert;
      else liegenGeblieben += 1;
    }
    for (const spalte of ["weight_kg", "energy", "sleep", "stress"]) {
      if (alles[spalte] !== null && alles[spalte] !== undefined) liegenGeblieben += 1;
    }
    if (Object.keys(ergaenzen).length === 0) {
      return { ok: true, kept: liegenGeblieben };
    }
    ergebnis = await db.from("check_ins").update(ergaenzen).eq("id", vorhanden.id).select("id");
  }

  if (ergebnis.error) return { ok: false, error: dbFehler(t, ergebnis.error.message) };
  if (!ergebnis.data || ergebnis.data.length !== 1) {
    return { ok: false, error: t.coach.checkinEntry.notSaved };
  }

  revalidatePath(`/coach/clients/${clientId}`);
  return { ok: true, kept: liegenGeblieben };
}
