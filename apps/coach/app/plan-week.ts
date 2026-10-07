import type { PlanDay, Session } from "@ptfive/types";

/**
 * Ein reines Datum („2026-09-04") als lokaler Tag.
 *
 * `new Date("2026-09-04")` liest den String als Mitternacht UTC. Westlich
 * von Greenwich ist das noch der Vortag — der Plan startete dann sichtbar
 * einen Tag früher, als der Trainer eingetragen hat. Mit angehängter
 * Uhrzeit liest JavaScript denselben String als lokale Mitternacht.
 *
 * Gilt für alle Felder vom Typ `date`: starts_on, started_on, week_of.
 */
export function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Ein Datum als reiner lokaler Tag: „2026-09-09". Gegenstück zu parseDay. */
export function dayISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * „seit 5 Tagen" — die Frage hinter dem Startdatum.
 *
 * Das Datum beantwortet „wann ging es los", die Spanne „wie lange läuft
 * das schon". Im Alltag zählt fast immer die zweite Frage; das Datum
 * allein muss der Trainer erst im Kopf verrechnen.
 *
 * Die Differenz wird zwischen zwei lokalen Mitternachten gerechnet. Über
 * eine Zeitumstellung hinweg sind das n·24h ± 1h — deshalb runden statt
 * abschneiden, sonst zählt der Wechsel auf Winterzeit einen Tag zu wenig.
 */
export function daysSince(startsOn: string, today: Date): number {
  const ref = new Date(today);
  ref.setHours(0, 0, 0, 0);
  return Math.round(
    (ref.getTime() - parseDay(startsOn).getTime()) / 86_400_000,
  );
}
// Der Satz dazu („seit 3 Wochen") steht im Wörterbuch: t.time.since.

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

/** Montag der Woche, in der das Datum liegt — lokal, nicht in UTC. */
export function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}

/**
 * Grobe Dauer eines Trainingstags in Minuten.
 *
 * Je Satz etwa 40 Sekunden Arbeit plus die vorgegebene Pause; ohne Vorgabe
 * 60 Sekunden. Das ist keine Wissenschaft, sondern die Antwort auf die
 * Frage „komme ich vor dem Termin noch durch?".
 *
 * Bewusst hier und nicht doppelt: Coach und Athlet müssen dieselbe Zahl
 * sehen, sonst verspricht der Plan etwas anderes als die App.
 */
export function estimateMinutes(
  slots: readonly { targetSets: number; restSeconds: number | null }[],
): number {
  if (slots.length === 0) return 0;
  const seconds = slots.reduce(
    (n, s) => n + s.targetSets * (40 + (s.restSeconds ?? 60)),
    0,
  );
  return Math.max(5, Math.round(seconds / 60));
}


export interface WeekSlotView {
  /** 1 = Montag … 7 = Sonntag. */
  weekday: number;
  /** Für diesen Wochentag eingeplante Tage. Leer = Ruhetag. */
  days: PlanDay[];
  /** IDs der Plantage, die in dieser Woche schon absolviert wurden. */
  doneDayIds: string[];
  /** Eine Einheit ohne Planbezug — freies Training zählt trotzdem. */
  freeSessions: number;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Baut die Wochenansicht: Was ist wann geplant, und was ist schon erledigt.
 *
 * Erledigt heißt: In dieser Kalenderwoche gibt es an diesem Wochentag eine
 * Einheit. Absichtlich nach Wochentag und nicht nach Plantag — trainiert
 * jemand Tag B am Dienstag statt am Mittwoch, war er trotzdem im Studio.
 */
export function buildWeek(
  days: readonly PlanDay[],
  sessions: readonly Session[],
  today: Date = new Date(),
): WeekSlotView[] {
  const monday = mondayOf(today);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  const todayWeekday = isoWeekday(today);

  const thisWeek = sessions.filter((s) => {
    const d = new Date(s.performedAt);
    return d >= monday && d < sunday;
  });

  return Array.from({ length: 7 }, (_, i) => {
    const weekday = i + 1;
    const onThisDay = thisWeek.filter(
      (s) => isoWeekday(new Date(s.performedAt)) === weekday,
    );
    return {
      weekday,
      // includes statt Gleichheit: Derselbe Trainingstag darf an
      // mehreren Wochentagen stehen und taucht dann mehrfach auf.
      days: days.filter((d) => d.weekdays.includes(weekday)),
      doneDayIds: onThisDay
        .map((s) => s.planDayId)
        .filter((id): id is string => id !== null),
      freeSessions: onThisDay.filter((s) => s.planDayId === null).length,
      isToday: weekday === todayWeekday,
      isPast: weekday < todayWeekday,
    };
  });
}

/** Tage ohne festen Wochentag — die stehen unter der Wochenleiste. */
export function flexibleDays(days: readonly PlanDay[]): PlanDay[] {
  return days.filter((d) => d.weekdays.length === 0);
}
