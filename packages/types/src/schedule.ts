/**
 * Termine und Check-ins.
 *
 * Der Terminstatus ist Datenbasis für spätere No-Show-Gebühren (Phase 2).
 * Deshalb wird er ab v1 sauber erfasst, auch wenn noch nichts abgerechnet wird.
 */

import type { ISODate, ISODateTime, UUID } from "./training";

export type AppointmentLocation = "gym" | "park" | "home" | "online";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "rescheduled"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: UUID;
  coachId: UUID;
  clientId: UUID;
  organisationId: UUID | null;
  startsAt: ISODateTime;
  durationMinutes: number;
  location: AppointmentLocation;
  locationNote: string | null;
  status: AppointmentStatus;
  /** Verknüpft den Termin mit dem geplanten Trainingstag. */
  planDayId: UUID | null;
  /** Gesetzt bei wiederkehrenden Terminen (z. B. jeden Di und Do). */
  recurrenceRule: string | null;
  recurrenceParentId: UUID | null;
  notes: string | null;
  createdAt: ISODateTime;
}

/** Wöchentliches Check-in. Der Coach bestimmt, welche Felder erscheinen. */
export interface CheckInConfig {
  askWeight: boolean;
  askPhotos: boolean;
  askEnergy: boolean;
  askSleep: boolean;
  askStress: boolean;
  askFreeText: boolean;
  /** 1 = Montag. */
  dueWeekday: number;
}

export interface CheckIn {
  id: UUID;
  clientId: UUID;
  coachId: UUID;
  /** Montag der betreffenden Woche. */
  weekOf: ISODate;
  submittedAt: ISODateTime | null;
  weightKg: number | null;
  /** Jeweils 1–5. */
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  clientNote: string | null;
  photoPaths: string[] | null;
  coachReply: string | null;
  coachRepliedAt: ISODateTime | null;
}

export type NudgeKind =
  | "next_session"
  | "checkin_due"
  | "inactivity"
  | "appointment_reminder";

export interface NudgeSetting {
  clientId: UUID;
  kind: NudgeKind;
  enabled: boolean;
}

export interface Message {
  id: UUID;
  coachId: UUID;
  clientId: UUID;
  senderProfileId: UUID;
  body: string;
  sentAt: ISODateTime;
  readAt: ISODateTime | null;
}

/** Ernährung im MVP bewusst schlank: Ziele setzen, Ist-Wert eintragen. */
export interface NutritionTarget {
  id: UUID;
  clientId: UUID;
  coachId: UUID;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  validFrom: ISODate;
}

export interface NutritionLog {
  id: UUID;
  clientId: UUID;
  loggedOn: ISODate;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}
