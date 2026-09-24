/**
 * Datenzugriff.
 *
 * Alle Abfragen laufen als angemeldeter Nutzer — die Mandantentrennung
 * übernimmt Row Level Security in der Datenbank. Es gibt hier bewusst KEINE
 * zusätzlichen where-coach_id-Filter: Was der Nutzer nicht sehen darf, kommt
 * gar nicht erst an. Wer hier filtert, verschleiert nur Policy-Fehler.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Appointment,
  Client,
  MovementPattern,
  Plan,
  Session,
  TrainingBlock,
  MuscleGroup,
} from "@ptfive/types";

/** Zeilenform, wie Postgres sie liefert (snake_case). */
interface ClientRow {
  id: string;
  coach_id: string;
  organisation_id: string | null;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  birth_date: string | null;
  avatar_path: string | null;
  status: Client["status"];
  level: Client["level"];
  goal: string | null;
  started_on: string;
  created_at: string;
}

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    coachId: row.coach_id,
    organisationId: row.organisation_id,
    profileId: row.profile_id,
    fullName: row.full_name,
    email: row.email,
    birthDate: row.birth_date ?? null,
    avatarPath: row.avatar_path ?? null,
    status: row.status,
    level: row.level,
    goal: row.goal,
    startedOn: row.started_on,
    createdAt: row.created_at,
  };
}

export async function fetchClients(db: SupabaseClient): Promise<Client[]> {
  const { data, error } = await db
    .from("clients")
    .select("*")
    .order("full_name");
  if (error) throw new Error(`Klienten laden fehlgeschlagen: ${error.message}`);
  return (data as ClientRow[]).map(toClient);
}

export async function fetchClient(
  db: SupabaseClient,
  clientId: string,
): Promise<Client | null> {
  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(`Klient laden fehlgeschlagen: ${error.message}`);
  return data ? toClient(data as ClientRow) : null;
}

interface SessionRow {
  id: string;
  client_id: string;
  coach_id: string;
  plan_id: string | null;
  plan_day_id: string | null;
  title: string;
  performed_at: string;
  is_self_directed: boolean;
  recorded_by: string | null;
  duration_seconds: number | null;
  is_complete: boolean;
  notes: string | null;
  session_slots: {
    id: string;
    session_id: string;
    plan_slot_id: string | null;
    pattern: MovementPattern | null;
    muscle_group: MuscleGroup | null;
    block: TrainingBlock;
    exercise_id: string;
    position: number;
    session_sets: {
      id: string;
      session_slot_id: string;
      set_number: number;
      weight_kg: number | string;
      body_load_kg: number | string | null;
      reps: number;
      is_bodyweight: boolean;
      rir: number | null;
    }[];
  }[];
}

/** numeric kommt als String aus Postgres — hier einmal sauber wandeln. */
const num = (v: number | string | null): number =>
  v === null ? 0 : typeof v === "number" ? v : Number.parseFloat(v);

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    clientId: row.client_id,
    coachId: row.coach_id,
    planId: row.plan_id,
    planDayId: row.plan_day_id,
    title: row.title,
    performedAt: row.performed_at,
    isSelfDirected: row.is_self_directed,
    recordedBy: row.recorded_by ?? null,
    durationSeconds: row.duration_seconds ?? null,
    isComplete: row.is_complete ?? true,
    notes: row.notes,
    slots: [...row.session_slots]
      .sort((a, b) => a.position - b.position)
      .map((slot) => ({
        id: slot.id,
        sessionId: slot.session_id,
        planSlotId: slot.plan_slot_id,
        pattern: slot.pattern,
        muscleGroup: slot.muscle_group ?? null,
        block: slot.block,
        exerciseId: slot.exercise_id,
        position: slot.position,
        sets: [...slot.session_sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({
            id: s.id,
            sessionSlotId: s.session_slot_id,
            setNumber: s.set_number,
            weightKg: num(s.weight_kg),
            // null bleibt null: „kein Körperanteil bekannt" ist etwas
            // anderes als „null Kilo Körperanteil".
            bodyLoadKg:
              s.body_load_kg === null || s.body_load_kg === undefined
                ? null
                : num(s.body_load_kg),
            reps: s.reps,
            isBodyweight: s.is_bodyweight,
            rir: s.rir === null || s.rir === undefined ? null : s.rir,
          })),
      })),
  };
}

const SESSION_SELECT =
  "*, session_slots(*, session_sets(*))";

export async function fetchSessions(
  db: SupabaseClient,
  options: { clientId?: string; sinceDays?: number } = {},
): Promise<Session[]> {
  let q = db.from("sessions").select(SESSION_SELECT);
  if (options.clientId) q = q.eq("client_id", options.clientId);
  if (options.sinceDays) {
    const since = new Date(Date.now() - options.sinceDays * 86_400_000);
    q = q.gte("performed_at", since.toISOString());
  }
  const { data, error } = await q.order("performed_at", { ascending: true });
  if (error) throw new Error(`Einheiten laden fehlgeschlagen: ${error.message}`);
  return (data as SessionRow[]).map(toSession);
}

// ---------- Pläne ----------

interface PlanSlotRow {
  id: string;
  plan_day_id: string;
  position: number;
  pattern: MovementPattern | null;
  muscle_group: MuscleGroup | null;
  block: TrainingBlock;
  label: string;
  default_exercise_id: string | null;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  superset_group: string | null;
  tempo: string | null;
  rest_seconds: number | null;
  note: string | null;
}

interface PlanDayRow {
  id: string;
  plan_id: string | null;
  position: number;
  title: string;
  is_guided: boolean;
  weekdays: number[] | null;
  plan_slots: PlanSlotRow[];
}

interface PlanRow {
  id: string;
  coach_id: string;
  client_id: string;
  template_id: string | null;
  name: string;
  level: Plan["level"];
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  created_at: string;
  plan_days: PlanDayRow[];
}

function toPlan(r: PlanRow): Plan {
  return {
    id: r.id,
    coachId: r.coach_id,
    clientId: r.client_id,
    templateId: r.template_id,
    name: r.name,
    level: r.level,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    isActive: r.is_active,
    createdAt: r.created_at,
    // Postgres garantiert keine Reihenfolge in verschachtelten Auswahlen —
    // deshalb hier sortieren und nicht auf die Datenbank vertrauen.
    days: [...(r.plan_days ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((d) => ({
        id: d.id,
        planId: r.id,
        position: d.position,
        title: d.title,
        isGuided: d.is_guided ?? false,
        // Die Datenbank haelt die Liste sortiert; leer und NULL sind
        // dasselbe und werden hier zu einer Schreibweise.
        weekdays: d.weekdays ?? [],
        slots: [...(d.plan_slots ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((s) => ({
            id: s.id,
            planDayId: s.plan_day_id,
            position: s.position,
            pattern: s.pattern,
            muscleGroup: s.muscle_group ?? null,
            block: s.block,
            label: s.label,
            defaultExerciseId: s.default_exercise_id,
            targetSets: s.target_sets,
            targetRepsMin: s.target_reps_min,
            targetRepsMax: s.target_reps_max,
            supersetGroup: s.superset_group,
            tempo: s.tempo ?? null,
            restSeconds: s.rest_seconds ?? null,
            note: s.note,
          })),
      })),
  };
}

const PLAN_SELECT = "*, plan_days(*, plan_slots(*))";

/** Alle Pläne eines Klienten, aktive zuerst, danach nach Startdatum. */
export async function fetchPlans(
  db: SupabaseClient,
  clientId: string,
): Promise<Plan[]> {
  const { data, error } = await db
    .from("plans")
    .select(PLAN_SELECT)
    .eq("client_id", clientId)
    .order("is_active", { ascending: false })
    .order("starts_on", { ascending: false });
  if (error) throw new Error(`Pläne laden fehlgeschlagen: ${error.message}`);
  return (data as PlanRow[]).map(toPlan);
}

export async function fetchPlan(
  db: SupabaseClient,
  planId: string,
): Promise<Plan | null> {
  const { data, error } = await db
    .from("plans")
    .select(PLAN_SELECT)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`Plan laden fehlgeschlagen: ${error.message}`);
  return data ? toPlan(data as PlanRow) : null;
}

/**
 * Der aktive Plan. Ohne clientId liefert RLS genau den des angemeldeten
 * Athleten — das ist der Weg, den die Athleten-App nimmt.
 */
export async function fetchActivePlan(
  db: SupabaseClient,
  clientId?: string,
): Promise<Plan | null> {
  let q = db.from("plans").select(PLAN_SELECT).eq("is_active", true);
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q
    .order("starts_on", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Plan laden fehlgeschlagen: ${error.message}`);
  const rows = data as PlanRow[];
  return rows.length > 0 ? toPlan(rows[0]!) : null;
}

interface AppointmentRow {
  id: string;
  coach_id: string;
  client_id: string;
  organisation_id: string | null;
  starts_at: string;
  duration_minutes: number;
  location: Appointment["location"];
  location_note: string | null;
  status: Appointment["status"];
  plan_day_id: string | null;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  notes: string | null;
  created_at: string;
}

function toAppointment(r: AppointmentRow): Appointment {
  return {
    id: r.id,
    coachId: r.coach_id,
    clientId: r.client_id,
    organisationId: r.organisation_id,
    startsAt: r.starts_at,
    durationMinutes: r.duration_minutes,
    location: r.location,
    locationNote: r.location_note,
    status: r.status,
    planDayId: r.plan_day_id,
    recurrenceRule: r.recurrence_rule,
    recurrenceParentId: r.recurrence_parent_id,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export async function fetchUpcomingAppointments(
  db: SupabaseClient,
  days = 7,
): Promise<Appointment[]> {
  const until = new Date(Date.now() + days * 86_400_000);
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .lte("starts_at", until.toISOString())
    .neq("status", "cancelled")
    .order("starts_at");
  if (error) throw new Error(`Termine laden fehlgeschlagen: ${error.message}`);
  return (data as AppointmentRow[]).map(toAppointment);
}

/**
 * Termine eines Zeitraums — für die Wochenansicht.
 * Abgesagte bleiben sichtbar, damit der Coach nachvollziehen kann, was war.
 */
export async function fetchAppointmentsBetween(
  db: SupabaseClient,
  from: Date,
  to: Date,
): Promise<Appointment[]> {
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at");
  if (error) throw new Error(`Termine laden fehlgeschlagen: ${error.message}`);
  return (data as AppointmentRow[]).map(toAppointment);
}

/**
 * Vergangene Termine, deren Status noch offen ist.
 * Der Coach soll nachtragen, ob stattgefunden — sonst fehlen die
 * No-Show-Daten für die spätere Abrechnung.
 */
export async function fetchUnresolvedAppointments(
  db: SupabaseClient,
  days = 14,
): Promise<Appointment[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .lt("starts_at", new Date().toISOString())
    .gte("starts_at", since.toISOString())
    .eq("status", "scheduled")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(`Termine laden fehlgeschlagen: ${error.message}`);
  return (data as AppointmentRow[]).map(toAppointment);
}

export interface OpenCheckIn {
  id: string;
  clientId: string;
  weekOf: string;
  submittedAt: string | null;
  weightKg: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  clientNote: string | null;
}

/** Eingereichte, aber noch unbeantwortete Check-ins. */
export async function fetchOpenCheckIns(
  db: SupabaseClient,
): Promise<OpenCheckIn[]> {
  const { data, error } = await db
    .from("check_ins")
    .select(
      "id, client_id, week_of, submitted_at, weight_kg, energy, sleep, stress, client_note",
    )
    .not("submitted_at", "is", null)
    .is("coach_replied_at", null)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(`Check-ins laden fehlgeschlagen: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    clientId: r.client_id as string,
    weekOf: r.week_of as string,
    submittedAt: r.submitted_at as string | null,
    weightKg: r.weight_kg === null ? null : num(r.weight_kg as string),
    energy: r.energy as number | null,
    sleep: r.sleep as number | null,
    stress: r.stress as number | null,
    clientNote: r.client_note as string | null,
  }));
}

/** Ein Check-in in voller Form — für Athleten-Ansicht und Coach-Posteingang. */
export interface CheckInRecord {
  id: string;
  clientId: string;
  coachId: string;
  weekOf: string;
  submittedAt: string | null;
  weightKg: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  clientNote: string | null;
  /** Koerpermasse in Zentimetern. null = nicht erhoben. */
  shouldersCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  coachReply: string | null;
  coachRepliedAt: string | null;
}

const CHECK_IN_FIELDS =
  "id, client_id, coach_id, week_of, submitted_at, weight_kg, energy, sleep, stress, client_note, shoulders_cm, chest_cm, waist_cm, arm_cm, thigh_cm, coach_reply, coach_replied_at";

/** numeric kommt als String aus Postgres; null bleibt null. */
function cmOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : Number.parseFloat(v as string);
}

function toCheckIn(r: Record<string, unknown>): CheckInRecord {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    coachId: r.coach_id as string,
    weekOf: r.week_of as string,
    submittedAt: (r.submitted_at as string | null) ?? null,
    weightKg: r.weight_kg === null ? null : num(r.weight_kg as string),
    energy: (r.energy as number | null) ?? null,
    sleep: (r.sleep as number | null) ?? null,
    stress: (r.stress as number | null) ?? null,
    clientNote: (r.client_note as string | null) ?? null,
    shouldersCm: cmOrNull(r.shoulders_cm),
    chestCm: cmOrNull(r.chest_cm),
    waistCm: cmOrNull(r.waist_cm),
    armCm: cmOrNull(r.arm_cm),
    thighCm: cmOrNull(r.thigh_cm),
    coachReply: (r.coach_reply as string | null) ?? null,
    coachRepliedAt: (r.coach_replied_at as string | null) ?? null,
  };
}

/**
 * Check-ins des angemeldeten Athleten, neueste zuerst.
 * RLS liefert nur die eigenen — kein Filter nötig.
 */
export async function fetchMyCheckIns(
  db: SupabaseClient,
  limit = 8,
): Promise<CheckInRecord[]> {
  const { data, error } = await db
    .from("check_ins")
    .select(CHECK_IN_FIELDS)
    .order("week_of", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Check-ins laden fehlgeschlagen: ${error.message}`);
  return (data ?? []).map(toCheckIn);
}

/**
 * Alle eingereichten Check-ins eines Coaches — auch die beantworteten.
 * Der Posteingang zeigt beides: offene zum Abarbeiten, beantwortete als Beleg.
 */
export async function fetchCoachCheckIns(
  db: SupabaseClient,
  weeks = 8,
): Promise<CheckInRecord[]> {
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);
  const { data, error } = await db
    .from("check_ins")
    .select(CHECK_IN_FIELDS)
    .not("submitted_at", "is", null)
    .gte("week_of", since.toISOString().slice(0, 10))
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(`Check-ins laden fehlgeschlagen: ${error.message}`);
  return (data ?? []).map(toCheckIn);
}

/**
 * Check-ins eines einzelnen Klienten für die Klientenakte.
 * Der client_id-Filter ist hier Sichtbereich, nicht Sicherheit — die
 * Trennung macht weiterhin RLS.
 */
export async function fetchClientCheckIns(
  db: SupabaseClient,
  clientId: string,
  limit = 12,
): Promise<CheckInRecord[]> {
  const { data, error } = await db
    .from("check_ins")
    .select(CHECK_IN_FIELDS)
    .eq("client_id", clientId)
    .not("submitted_at", "is", null)
    .order("week_of", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Check-ins laden fehlgeschlagen: ${error.message}`);
  return (data ?? []).map(toCheckIn);
}

/** Welche Felder das Formular zeigt. Fehlt die Zeile, gelten die Standardwerte. */
export interface CheckInFields {
  askWeight: boolean;
  askEnergy: boolean;
  askSleep: boolean;
  askStress: boolean;
  askFreeText: boolean;
  dueWeekday: number;
  askShoulders: boolean;
  askChest: boolean;
  askWaist: boolean;
  askArm: boolean;
  askThigh: boolean;
  /** Alle wie viele Wochen das Massband herauskommt. */
  measureEveryWeeks: number;
}

/** Gelten, solange der Coach nichts eingestellt hat. */
export const DEFAULT_CHECK_IN_FIELDS: CheckInFields = {
  askWeight: true,
  askEnergy: true,
  askSleep: true,
  askStress: true,
  askFreeText: true,
  dueWeekday: 7,
  // Standard: nur die Taille. Aussagekraeftigstes Einzelmass fuer
  // Fettverlust und in zehn Sekunden gemessen.
  askShoulders: false,
  askChest: false,
  askWaist: true,
  askArm: false,
  askThigh: false,
  measureEveryWeeks: 4,
};

export async function fetchCheckInConfig(
  db: SupabaseClient,
  clientId: string,
): Promise<CheckInFields> {
  const { data, error } = await db
    .from("check_in_configs")
    .select(
      "ask_weight, ask_energy, ask_sleep, ask_stress, ask_free_text, due_weekday, ask_shoulders, ask_chest, ask_waist, ask_arm, ask_thigh, measure_every_weeks",
    )
    .eq("client_id", clientId)
    .maybeSingle();
  // Eine fehlende Konfiguration ist kein Fehler — dann gelten die Standards.
  if (error || !data) return DEFAULT_CHECK_IN_FIELDS;
  return {
    askWeight: data.ask_weight as boolean,
    askEnergy: data.ask_energy as boolean,
    askSleep: data.ask_sleep as boolean,
    askStress: data.ask_stress as boolean,
    askFreeText: data.ask_free_text as boolean,
    dueWeekday: data.due_weekday as number,
    askShoulders: (data.ask_shoulders as boolean) ?? false,
    askChest: (data.ask_chest as boolean) ?? false,
    askWaist: (data.ask_waist as boolean) ?? true,
    askArm: (data.ask_arm as boolean) ?? false,
    askThigh: (data.ask_thigh as boolean) ?? false,
    measureEveryWeeks: (data.measure_every_weeks as number) ?? 4,
  };
}

export interface ExerciseLite {
  id: string;
  name: string;
  /** null bei Rumpfarbeit — die läuft ohne Musterkurve. */
  pattern: MovementPattern | null;
  /** Hauptsächlich trainierte Muskelgruppe — Grundlage der Auswertung. */
  muscleGroup: MuscleGroup;
  /** Weitere Gruppen, unter denen die Übung gefunden werden soll. */
  secondaryMuscleGroups: MuscleGroup[];
  /** Anteil des Körpergewichts; null = läuft über Wiederholungen. */
  bodyweightFactor: number | null;
  /** null = globale Bibliothek, sonst Eigentum eines Coaches. */
  coachId: string | null;
}

export async function fetchExercises(
  db: SupabaseClient,
): Promise<Map<string, ExerciseLite>> {
  const { data, error } = await db
    .from("exercises")
    .select(
      "id, name, pattern, muscle_group, secondary_muscle_groups, bodyweight_factor, coach_id",
    );
  if (error) throw new Error(`Übungen laden fehlgeschlagen: ${error.message}`);
  return new Map(
    (data ?? []).map((e) => [
      e.id as string,
      {
        id: e.id as string,
        name: e.name as string,
        pattern: (e.pattern as MovementPattern | null) ?? null,
        muscleGroup: e.muscle_group as MuscleGroup,
        secondaryMuscleGroups:
          (e.secondary_muscle_groups as MuscleGroup[] | null) ?? [],
        bodyweightFactor: e.bodyweight_factor === null ? null : num(e.bodyweight_factor as number | string),
        coachId: (e.coach_id as string | null) ?? null,
      },
    ]),
  );
}

export interface ExerciseFull extends ExerciseLite {
  block: TrainingBlock;
  cue: string | null;
  /** Aufbau: Bankwinkel, Griffbreite, Standbreite. */
  setup: string | null;
  commonFault: string | null;
  isBodyweight: boolean;
}

/** Volle Bibliothek für die Übungsverwaltung des Coaches. */
export async function fetchExerciseLibrary(
  db: SupabaseClient,
): Promise<ExerciseFull[]> {
  const { data, error } = await db
    .from("exercises")
    .select(
      "id, name, pattern, muscle_group, secondary_muscle_groups, bodyweight_factor, coach_id, default_block, cue, setup, common_fault, is_bodyweight",
    )
    .order("name");
  if (error) throw new Error(`Übungen laden fehlgeschlagen: ${error.message}`);
  return (data ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    pattern: (e.pattern as MovementPattern | null) ?? null,
    muscleGroup: e.muscle_group as MuscleGroup,
    secondaryMuscleGroups:
      (e.secondary_muscle_groups as MuscleGroup[] | null) ?? [],
    bodyweightFactor: e.bodyweight_factor === null ? null : num(e.bodyweight_factor as number | string),
    coachId: (e.coach_id as string | null) ?? null,
    block: e.default_block as TrainingBlock,
    cue: (e.cue as string | null) ?? null,
    setup: (e.setup as string | null) ?? null,
    commonFault: (e.common_fault as string | null) ?? null,
    isBodyweight: e.is_bodyweight as boolean,
  }));
}

// ---------- Fortschrittsauswahl ----------

/**
 * Welche Übungen jemand auf der Fortschrittsseite sehen will.
 *
 * `viewerId` ist der Betrachter: der Athlet für seine eigene Seite, der
 * Trainer für die Klientenakte. Beide wählen unabhängig — der Athlet
 * schaut auf seine Entwicklung, der Trainer auf die Stellen, an denen
 * er nachsteuern will.
 *
 * Leere Liste heisst „noch nie gewählt" — die Oberfläche schlägt dann
 * die häufigsten Übungen vor. Ein bewusst abgewähltes Alles ist davon
 * nicht zu unterscheiden; das ist der Preis dafür, ohne zusätzliches
 * Kennzeichen auszukommen, und im Alltag harmlos.
 */
export async function fetchProgressSelection(
  db: SupabaseClient,
  clientId: string,
  viewerId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from("progress_selections")
    .select("exercise_id, position")
    .eq("client_id", clientId)
    .eq("viewer_id", viewerId)
    .order("position");
  if (error) throw new Error(`Auswahl laden fehlgeschlagen: ${error.message}`);
  return (data ?? []).map((r) => r.exercise_id as string);
}

// ---------- Anordnung der Klientenakte ----------

/** Ein Abschnitt der Akte, wie dieser Trainer ihn eingestellt hat. */
export interface ViewSection {
  section: string;
  position: number;
  isVisible: boolean;
}

/**
 * Die Anordnung der Klientenakte für einen Trainer.
 *
 * Gilt für ALLE seine Klienten, nicht je Klient — wer die Akte anders
 * liest, liest sie bei jedem Klienten anders. Eine Einstellung je Klient
 * hiesse, sie zwanzigmal zu pflegen.
 *
 * Leere Liste heisst „nie etwas eingestellt": Die Oberfläche zeigt dann
 * ihre Standardanordnung. Abschnitte, die hier fehlen, gelten ebenfalls
 * als sichtbar — so tauchen später hinzugekommene Abschnitte auch bei
 * Trainern auf, die schon einmal etwas eingestellt haben.
 *
 * FEHLT DIE TABELLE, GIBT ES KEINEN FEHLER.
 *
 * Das ist keine Bequemlichkeit, sondern eine Frage der Verhältnis-
 * mäßigkeit. Diese Abfrage holt eine Anzeigevorliebe. Läuft die
 * Migration 0019 noch nicht — beim Ausrollen liegen Code und Schema
 * immer ein paar Minuten auseinander —, dann stürzte vorher die
 * KOMPLETTE Klientenakte ab: kein Plan, keine Check-ins, keine
 * Einheiten, nur eine rote Fehlerseite. Wegen der Reihenfolge von
 * Kacheln.
 *
 * Also: Tabelle nicht da → Standardanordnung, plus eine Warnung im
 * Serverprotokoll. Still verschluckt wird nichts; ein Fehler, den man
 * nirgends sieht, ist schlimmer als einer, der knallt.
 *
 * Alle ANDEREN Fehler fliegen weiter. Eine kaputte Abfrage oder eine
 * verweigerte Zeilensicherheit sind echte Fehler und sollen auffallen.
 */
export async function fetchViewSections(
  db: SupabaseClient,
  viewerId: string,
): Promise<ViewSection[]> {
  const { data, error } = await db
    .from("client_view_sections")
    .select("section, position, is_visible")
    .eq("viewer_id", viewerId)
    .order("position");

  if (error) {
    // PGRST205 = PostgREST kennt die Tabelle nicht (Schema-Cache),
    // 42P01 = Postgres kennt sie nicht. Beide heissen: Migration fehlt.
    const fehltNoch =
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      /schema cache|does not exist/i.test(error.message);

    if (fehltNoch) {
      console.warn(
        "[ptthree] Tabelle client_view_sections fehlt — die Klientenakte " +
          "laeuft in der Standardanordnung. Migration 0019 einspielen.",
      );
      return [];
    }
    throw new Error(`Anordnung laden fehlgeschlagen: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    section: r.section as string,
    position: r.position as number,
    isVisible: r.is_visible as boolean,
  }));
}

// ---------- Fortschrittsfotos ----------

export const PHOTO_BUCKET = "progress-photos";

/**
 * Profilbilder. Bewusst ein anderer Bucket als die Fortschrittsfotos.
 *
 * Ein Fortschrittsfoto zeigt den Koerper und dient der Beurteilung des
 * Trainingsstands — Gesundheitsdaten nach Art. 9, mit Einwilligung.
 * Ein Profilbild ist ein Erkennungszeichen, das jemand freiwillig fuer
 * genau diesen Zweck hochlaedt. Zwei Zwecke, zwei Buckets, zwei
 * Regelwerke.
 */
export const AVATAR_BUCKET = "avatars";

export type PhotoPose = "front" | "side" | "back";

export interface ProgressPhoto {
  id: string;
  clientId: string;
  /** Der Tag, den der Athlet meint — nicht der Upload-Zeitpunkt. */
  takenOn: string;
  pose: PhotoPose;
  storagePath: string;
  width: number | null;
  height: number | null;
  /** Signierter Link, kurz gültig. Null, wenn er nicht erzeugt werden konnte. */
  url: string | null;
}

export interface PhotoConsent {
  id: string;
  grantedAt: string;
  revokedAt: string | null;
  textVersion: string;
}

/**
 * Die gültige Einwilligung eines Klienten, oder null.
 *
 * Lesen darf sie auch der Trainer: Er muss erkennen können, warum die
 * Galerie leer ist. Eine leere Galerie ohne Erklärung führt zu „die App
 * zeigt die Bilder nicht an", und das ist eine Fehlersuche, die es
 * nicht geben muss.
 */
export async function fetchPhotoConsent(
  db: SupabaseClient,
  clientId: string,
): Promise<PhotoConsent | null> {
  const { data, error } = await db
    .from("photo_consents")
    .select("id, granted_at, revoked_at, text_version")
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    if (fehltNoch(error)) return null;
    throw new Error(`Einwilligung laden fehlgeschlagen: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id as string,
    grantedAt: data.granted_at as string,
    revokedAt: (data.revoked_at as string | null) ?? null,
    textVersion: data.text_version as string,
  };
}

/**
 * Die Fotos eines Klienten, neueste zuerst — mit signierten Links.
 *
 * Der Bucket ist privat. Ein öffentlicher Bucket bräuchte nur die
 * geratene Dateiadresse, und bei Körperfotos ist das keine theoretische
 * Sorge. Also signierte Links mit einer Stunde Laufzeit: lang genug für
 * eine Sitzung, kurz genug, dass ein weitergeleiteter Link nicht
 * dauerhaft trägt.
 *
 * Fehlt die Einwilligung, liefert schon die Zeilensicherheit nichts —
 * hier steht kein zusätzlicher Filter. Wer hier filtert, verschleiert
 * nur Fehler in den Regeln.
 */
export async function fetchProgressPhotos(
  db: SupabaseClient,
  clientId: string,
): Promise<ProgressPhoto[]> {
  const { data, error } = await db
    .from("progress_photos")
    .select("id, client_id, taken_on, pose, storage_path, width, height")
    .eq("client_id", clientId)
    .order("taken_on", { ascending: false })
    .order("pose");

  if (error) {
    if (fehltNoch(error)) return [];
    throw new Error(`Fotos laden fehlgeschlagen: ${error.message}`);
  }

  const zeilen = data ?? [];
  if (zeilen.length === 0) return [];

  // Ein Aufruf für alle Pfade statt einer Runde je Bild: Bei einem
  // Jahr Fotos sind das sonst fünfzig Anfragen für eine Seite.
  const pfade = zeilen.map((r) => r.storage_path as string);
  const { data: links } = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(pfade, 60 * 60);

  const karte = new Map<string, string>();
  for (const l of links ?? []) {
    if (l.signedUrl && !l.error) karte.set(l.path ?? "", l.signedUrl);
  }

  return zeilen.map((r) => ({
    id: r.id as string,
    clientId: r.client_id as string,
    takenOn: r.taken_on as string,
    pose: r.pose as PhotoPose,
    storagePath: r.storage_path as string,
    width: (r.width as number | null) ?? null,
    height: (r.height as number | null) ?? null,
    url: karte.get(r.storage_path as string) ?? null,
  }));
}

/**
 * Fehlt die Tabelle noch?
 *
 * Dieselbe Überlegung wie bei `fetchViewSections`: Beim Ausrollen
 * liegen Code und Schema ein paar Minuten auseinander. Eine
 * Fotogalerie, die in dieser Zeit die ganze Seite mitreisst, wäre ein
 * selbstgemachter Ausfall.
 */
function fehltNoch(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  return /schema cache|does not exist/i.test(error.message);
}
