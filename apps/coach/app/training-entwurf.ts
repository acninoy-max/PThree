/**
 * Zwischenspeicher für ein laufendes Training.
 *
 * WARUM
 * -----
 * Bis 20.10.2026 lebte ein Training nur im Arbeitsspeicher der Seite.
 * Ein Tipp auf „Heute", ein Wischen zurück, ein iPhone, das Safari im
 * Hintergrund beendet — und zwanzig eingetragene Sätze waren weg. Das
 * war im ersten Test der einzige echte Datenverlust (Joël, 15.10.).
 *
 * Jetzt landet jeder Stand im `localStorage` des Geräts. Öffnet man das
 * Training wieder, fragt die Seite: weitermachen oder verwerfen.
 *
 * Gespeichert werden nur IDs und Feldinhalte, keine Übungsobjekte: Die
 * kommen beim Wiederherstellen frisch vom Server. Eine Übung, die es
 * inzwischen nicht mehr gibt, fällt still heraus — besser als ein Satz
 * unter einem Namen, den die Datenbank nicht kennt.
 *
 * Reine Logik ohne React und ohne `window`, damit sie im App-Testlauf
 * läuft. Den Speicher reicht der Aufrufer herein (`holeSpeicher`).
 */

import type { Break } from "./athlete/log/rest";

/** Erhöhen, wenn sich die Form ändert — alte Entwürfe gelten dann als ungültig. */
const VERSION = 1;

/** Nach einem Tag ist ein Entwurf kein unterbrochenes Training mehr, sondern Müll. */
export const MAX_ALTER_MS = 24 * 60 * 60 * 1000;

/**
 * Ab dieser Lücke zwischen letzter Eingabe und Wiederaufnahme zählt die
 * Zeit dazwischen als Pause. Kürzere Lücken sind normales Training
 * (ein Satz dauert, bis man ihn einträgt); längere heißen, das Handy
 * lag weg — die sollen die Trainingsdauer nicht aufblähen.
 */
export const LUECKE_ALS_PAUSE_MS = 15 * 60 * 1000;

export interface EntwurfSatz {
  weight: string;
  reps: string;
  rir: string;
}

export interface EntwurfSlot {
  key: string;
  exerciseId: string;
  planSlotId: string | null;
  sets: EntwurfSatz[];
}

export interface TrainingsEntwurf {
  v: number;
  gespeichertAm: number;
  begonnenAm: number;
  dayId: string | null;
  dayTitle: string | null;
  slots: EntwurfSlot[];
  breaks: Break[];
}

/** Was `localStorage` kann und wir brauchen — im Test ein einfaches Objekt. */
export interface Speicher {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Schlüssel je Konto (und beim Trainer je Klient).
 *
 * Zwei Konten auf einem Gerät — ein Trainer, der sich zum Testen als
 * Athlet anmeldet — dürfen sich nicht gegenseitig ein Training
 * unterschieben.
 */
export function entwurfSchluessel(
  wer: "athlet" | "trainer",
  nutzerId: string,
  klientId?: string,
): string {
  return wer === "trainer"
    ? `pt-training:trainer:${nutzerId}:${klientId ?? ""}`
    : `pt-training:athlet:${nutzerId}`;
}

/**
 * `localStorage`, falls erreichbar.
 *
 * Schon der Zugriff kann werfen (Safari privat, gesperrte Cookies). Dann
 * gibt es eben keinen Zwischenspeicher — das Training läuft trotzdem.
 */
export function holeSpeicher(): Speicher | null {
  try {
    const s = (globalThis as { localStorage?: Speicher }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

function istEntwurf(x: unknown): x is TrainingsEntwurf {
  if (!x || typeof x !== "object") return false;
  const e = x as Partial<TrainingsEntwurf>;
  return (
    e.v === VERSION &&
    typeof e.gespeichertAm === "number" &&
    typeof e.begonnenAm === "number" &&
    Array.isArray(e.slots) &&
    Array.isArray(e.breaks)
  );
}

/**
 * Liest den Entwurf. Kaputte oder zu alte Einträge werden gleich
 * gelöscht, damit die Frage „weitermachen?" nicht bei jedem Öffnen für
 * etwas kommt, das sich nicht wiederherstellen lässt.
 */
export function ladeEntwurf(
  speicher: Speicher | null,
  key: string,
  jetzt: number,
): TrainingsEntwurf | null {
  if (!speicher) return null;
  try {
    const roh = speicher.getItem(key);
    if (!roh) return null;
    const e: unknown = JSON.parse(roh);
    if (!istEntwurf(e) || jetzt - e.gespeichertAm > MAX_ALTER_MS) {
      speicher.removeItem(key);
      return null;
    }
    return e;
  } catch {
    try {
      speicher.removeItem(key);
    } catch {
      // Nicht einmal Löschen geht — dann bleibt es, wie es ist.
    }
    return null;
  }
}

/**
 * Schreibt den Stand. Gibt zurück, ob es geklappt hat — voller Speicher
 * oder privater Modus werfen hier. Der Aufrufer zeigt dann keinen
 * Fehler: Das Training geht weiter, nur eben ohne Netz.
 */
export function sichereEntwurf(
  speicher: Speicher | null,
  key: string,
  e: Omit<TrainingsEntwurf, "v">,
): boolean {
  if (!speicher) return false;
  try {
    speicher.setItem(key, JSON.stringify({ v: VERSION, ...e }));
    return true;
  } catch {
    return false;
  }
}

export function verwirfEntwurf(speicher: Speicher | null, key: string): void {
  if (!speicher) return;
  try {
    speicher.removeItem(key);
  } catch {
    // Siehe ladeEntwurf.
  }
}

/** Kurzfassung für die Rückfrage: wie viele Übungen, wie viele Sätze eingetragen. */
export function entwurfUmfang(e: TrainingsEntwurf): {
  uebungen: number;
  saetze: number;
} {
  return {
    uebungen: e.slots.length,
    saetze: e.slots.reduce(
      (n, s) => n + s.sets.filter((x) => Number(x.reps) > 0).length,
      0,
    ),
  };
}

/** Ein Slot in der Maske, egal ob Athlet oder Trainer. */
export interface MaskenSlot<E, P> {
  key: string;
  exercise: E;
  plan: P | null;
  sets: EntwurfSatz[];
}

/** Maske → Entwurf: nur IDs und Feldinhalte. */
export function slotsZuEntwurf<E extends { id: string }, P extends { id: string }>(
  slots: MaskenSlot<E, P>[],
): EntwurfSlot[] {
  return slots.map((s) => ({
    key: s.key,
    exerciseId: s.exercise.id,
    planSlotId: s.plan?.id ?? null,
    sets: s.sets.map((x) => ({ weight: x.weight, reps: x.reps, rir: x.rir })),
  }));
}

/**
 * Entwurf → Maske, mit den frischen Übungen und Plan-Slots vom Server.
 * Unbekannte Übungen fallen heraus (siehe oben); ein unbekannter
 * Plan-Slot macht aus der Übung eine freie, die Sätze bleiben.
 */
export function entwurfZuSlots<E extends { id: string }, P extends { id: string }>(
  e: TrainingsEntwurf,
  uebungen: E[],
  planSlots: P[],
): MaskenSlot<E, P>[] {
  const out: MaskenSlot<E, P>[] = [];
  for (const s of e.slots) {
    const exercise = uebungen.find((u) => u.id === s.exerciseId);
    if (!exercise) continue;
    out.push({
      key: s.key,
      exercise,
      plan: s.planSlotId ? (planSlots.find((p) => p.id === s.planSlotId) ?? null) : null,
      sets: s.sets.length > 0 ? s.sets : [{ weight: "", reps: "", rir: "" }],
    });
  }
  return out;
}

/**
 * Pausen beim Weitermachen.
 *
 * Lag das Gerät länger als `LUECKE_ALS_PAUSE_MS`, wird die Zeit seit der
 * letzten Eingabe als Pause angehängt. Läuft schon eine angehaltene
 * Pause, endet sie jetzt.
 */
export function pausenBeimFortsetzen(e: TrainingsEntwurf, jetzt: number): Break[] {
  const breaks = e.breaks.map((b) => ({ ...b }));
  const offen = breaks[breaks.length - 1];
  if (offen && offen.bis === null) {
    offen.bis = jetzt;
    return breaks;
  }
  if (jetzt - e.gespeichertAm > LUECKE_ALS_PAUSE_MS) {
    breaks.push({ von: e.gespeichertAm, bis: jetzt });
  }
  return breaks;
}
