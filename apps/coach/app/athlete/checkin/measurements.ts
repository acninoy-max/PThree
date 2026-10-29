import type { CheckInFields, CheckInRecord } from "@ptfive/db";
import type { Dict } from "@/app/i18n";
import { bereichFaellig } from "./rhythmus";
import { koerperfettYmca, type FormelGeschlecht } from "@/app/koerperfett";

export type MeasureKey = "shoulders" | "chest" | "waist" | "arm" | "thigh";

export const MEASURE_KEYS: readonly MeasureKey[] = [
  "shoulders",
  "chest",
  "waist",
  "arm",
  "thigh",
] as const;

/**
 * Spalte und Farbe je Maß. Name und Messanleitung stehen im Wörterbuch
 * (`t.labels.measure`) — die Anleitung ist dort, wo sie übersetzt wird.
 */
export const MEASURE_INFO: Record<
  MeasureKey,
  { field: keyof CheckInRecord; color: string }
> = {
  shoulders: { field: "shouldersCm", color: "#0f766e" },
  chest: { field: "chestCm", color: "#7c3aed" },
  waist: { field: "waistCm", color: "#1d4ed8" },
  arm: { field: "armCm", color: "#854d0e" },
  thigh: { field: "thighCm", color: "#3b6d11" },
};

/** Gewicht ist keine Maßband-Größe, gehört aber in dieselbe Kurve. */
export const WEIGHT_COLOR = "#c42d1a";
/** Körperfett (geschätzt) — eigene Farbe, nah am Gewicht. */
export const BODYFAT_COLOR = "#b45309";

/**
 * Baut die Reihen für das Verlaufsdiagramm aus den Check-ins.
 * Leere Reihen fallen weg — ein Chip ohne Daten wäre nur Frust.
 */
export function buildSeries(
  t: Dict,
  history: readonly CheckInRecord[],
  /** Für die Körperfett-Schätzung (0037). null = keine Kurve dafür. */
  formulaSex: FormelGeschlecht | null = null,
): {
  key: string;
  label: string;
  unit: string;
  color: string;
  points: { on: string; value: number }[];
}[] {
  const sorted = [...history].sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  const weight = {
    key: "weight",
    label: t.labels.weight,
    unit: "kg",
    color: WEIGHT_COLOR,
    points: sorted
      .filter((c) => c.weightKg !== null)
      .map((c) => ({ on: c.weekOf, value: c.weightKg! })),
  };

  const measures = MEASURE_KEYS.map((k) => {
    const info = MEASURE_INFO[k];
    return {
      key: k,
      label: t.labels.measure[k].label,
      unit: "cm",
      color: info.color,
      points: sorted
        .map((c) => ({ on: c.weekOf, value: c[info.field] as number | null }))
        .filter((p): p is { on: string; value: number } => p.value !== null),
    };
  });

  // Körperfett, geschätzt aus Taille und Gewicht derselben Woche
  // (koerperfett.ts). Nur Wochen mit beidem bekommen einen Punkt.
  const koerperfett = {
    key: "bodyfat",
    label: t.labels.bodyFatEstimated,
    unit: "%",
    color: BODYFAT_COLOR,
    points: sorted
      .map((c) => ({ on: c.weekOf, value: koerperfettYmca(c.waistCm, c.weightKg, formulaSex) }))
      .filter((p): p is { on: string; value: number } => p.value !== null),
  };

  return [weight, koerperfett, ...measures].filter((s) => s.points.length > 0);
}

/** Welche Maße der Coach für diesen Klienten eingeschaltet hat. */
export function activeMeasures(fields: CheckInFields): MeasureKey[] {
  const on: Record<MeasureKey, boolean> = {
    shoulders: fields.askShoulders,
    chest: fields.askChest,
    waist: fields.askWaist,
    arm: fields.askArm,
    thigh: fields.askThigh,
  };
  return MEASURE_KEYS.filter((k) => on[k]);
}

/**
 * Ist diese Woche Messwoche?
 *
 * Gerechnet wird ab dem letzten Check-in, in dem tatsächlich gemessen
 * wurde — nicht ab einem festen Kalenderraster. Wer eine Woche
 * verpasst, wird beim nächsten Mal gefragt, statt vier Wochen zu
 * warten.
 */
export function isMeasureWeek(
  history: readonly CheckInRecord[],
  fields: CheckInFields,
  thisWeekOf: string,
): boolean {
  if (activeMeasures(fields).length === 0) return false;
  return bereichFaellig(history, thisWeekOf, fields.measureEveryWeeks, (c) =>
    MEASURE_KEYS.some((k) => c[MEASURE_INFO[k].field] !== null),
  );
}

/** Gewicht diese Woche abfragen? (Rhythmus seit 0034) */
export function isWeightWeek(
  history: readonly CheckInRecord[],
  fields: CheckInFields,
  thisWeekOf: string,
): boolean {
  if (!fields.askWeight) return false;
  return bereichFaellig(history, thisWeekOf, fields.weightEveryWeeks, (c) => c.weightKg !== null);
}

/** Energie, Schlaf, Stress diese Woche abfragen? (Rhythmus seit 0034) */
export function isWellbeingWeek(
  history: readonly CheckInRecord[],
  fields: CheckInFields,
  thisWeekOf: string,
): boolean {
  if (!fields.askEnergy && !fields.askSleep && !fields.askStress) return false;
  return bereichFaellig(
    history,
    thisWeekOf,
    fields.wellbeingEveryWeeks,
    (c) => c.energy !== null || c.sleep !== null || c.stress !== null,
  );
}

export interface FaelligeBereiche {
  weight: boolean;
  wellbeing: boolean;
  measures: boolean;
}

/**
 * Was der Klient diese Woche selbst ausfüllen soll.
 *
 * Eine Stelle für Formular UND Speichern: Das Speichern schreibt nur die
 * Bereiche, die hier dran sind. Sonst löschte ein abgeschicktes Check-in
 * die Maße, die der Trainer am Montag im Studio eingetragen hat.
 *
 * Personal Training (0034): Maße nimmt der Trainer, der Klient wird
 * nicht danach gefragt.
 */
export function faelligeBereiche(
  history: readonly CheckInRecord[],
  fields: CheckInFields,
  coachingType: "personal" | "online" | "hybrid",
  thisWeekOf: string,
): FaelligeBereiche {
  return {
    weight: isWeightWeek(history, fields, thisWeekOf),
    wellbeing: isWellbeingWeek(history, fields, thisWeekOf),
    measures: coachingType !== "personal" && isMeasureWeek(history, fields, thisWeekOf),
  };
}
