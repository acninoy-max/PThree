/**
 * Personen, Rollen, Mandanten.
 *
 * organisationId liegt ab Tag 1 an allen relevanten Entitäten — auch wenn das
 * Ketten-Dashboard erst Phase 2 kommt. Ohne dieses Feld ließe sich die Historie
 * später nicht je Kette aggregieren.
 */

import type { ISODate, ISODateTime, UUID } from "./training";

export type Role = "coach" | "athlete" | "org_admin";

export interface Organisation {
  id: UUID;
  /** z. B. "Trainmore". */
  name: string;
  slug: string;
  /** Optionales Co-Branding im QA-Dashboard. */
  logoUrl: string | null;
  createdAt: ISODateTime;
}

export interface Profile {
  id: UUID; // entspricht auth.users.id
  role: Role;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  locale: "de" | "en" | "nl";
  createdAt: ISODateTime;
}

export interface Coach {
  id: UUID; // = profiles.id
  /** null = unabhängiger Trainer ohne Kettenbindung. */
  organisationId: UUID | null;
  displayName: string;
  bio: string | null;
  /** Erscheint auf Plan-PDFs neben "powered by PTHREE". */
  brandLogoUrl: string | null;
  timezone: string;
  createdAt: ISODateTime;
}

export type ClientStatus = "active" | "paused" | "archived";

export interface Client {
  id: UUID;
  coachId: UUID;
  organisationId: UUID | null;
  /** Gesetzt, sobald der Klient die Einladung annimmt. */
  profileId: UUID | null;
  fullName: string;
  /**
   * Kontaktadresse. NICHT zwingend die Anmeldeadresse — die steht in
   * `auth.users` und kann davon abweichen. Beim Anlegen schlaegt der
   * Trainer sie fuer die Einladung vor.
   */
  email: string | null;
  /** Geburtsdatum, YYYY-MM-DD. Kein Alter: Das veraltet jedes Jahr. */
  birthDate: ISODate | null;
  /** Profilbild im Bucket "avatars", Pfad ohne Bucketnamen. */
  avatarPath: string | null;
  status: ClientStatus;
  level: "beginner" | "intermediate" | "pro";
  goal: string | null;
  startedOn: ISODate;
  createdAt: ISODateTime;
}

/**
 * Fortschritt wird über vier Kanäle gemessen, nicht nur über Gewicht.
 * Fotos und Körpermaße sind Gesundheitsdaten nach Art. 9 DSGVO und liegen
 * ausschließlich in verschlüsseltem Storage mit signierten URLs.
 */
export interface BodyMetric {
  id: UUID;
  clientId: UUID;
  recordedOn: ISODate;
  weightKg: number | null;
  bodyFatPercent: number | null;
  /** Umfänge in cm, frei benannt (z. B. { waist: 82 }). */
  measurements: Record<string, number> | null;
  photoPaths: string[] | null;
}
