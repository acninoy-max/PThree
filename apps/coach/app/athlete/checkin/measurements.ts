import type { CheckInFields, CheckInRecord } from "@ptfive/db";

export type MeasureKey = "shoulders" | "chest" | "waist" | "arm" | "thigh";

export const MEASURE_KEYS: readonly MeasureKey[] = [
  "shoulders",
  "chest",
  "waist",
  "arm",
  "thigh",
] as const;

/**
 * Zu jedem Maß eine Anleitung in einem Satz.
 *
 * Das ist nicht Deko: Taille am Bauchnabel oder an der schmalsten
 * Stelle unterscheidet sich um drei bis fünf Zentimeter. Misst der
 * Athlet jede Woche anders, ist der „Fortschritt" nur Rauschen —
 * dann wäre die ganze Erhebung wertlos.
 */
export const MEASURE_INFO: Record<
  MeasureKey,
  { label: string; how: string; field: keyof CheckInRecord; color: string }
> = {
  shoulders: {
    label: "Schultern",
    how: "Um die breiteste Stelle, Arme locker hängen lassen.",
    field: "shouldersCm",
    color: "#0f766e",
  },
  chest: {
    label: "Brust",
    how: "Auf Brustwarzenhöhe, am Ende einer normalen Ausatmung.",
    field: "chestCm",
    color: "#7c3aed",
  },
  waist: {
    label: "Taille",
    how: "Auf Höhe des Bauchnabels, nicht einziehen.",
    field: "waistCm",
    color: "#1d4ed8",
  },
  arm: {
    label: "Oberarm",
    how: "Rechter Arm, angespannt, an der dicksten Stelle.",
    field: "armCm",
    color: "#854d0e",
  },
  thigh: {
    label: "Oberschenkel",
    how: "Rechtes Bein, eine Handbreit unter dem Schritt.",
    field: "thighCm",
    color: "#3b6d11",
  },
};

/** Gewicht ist keine Maßband-Größe, gehört aber in dieselbe Kurve. */
export const WEIGHT_COLOR = "#c42d1a";

/**
 * Baut die Reihen für das Verlaufsdiagramm aus den Check-ins.
 * Leere Reihen fallen weg — ein Chip ohne Daten wäre nur Frust.
 */
export function buildSeries(
  history: readonly CheckInRecord[],
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
    label: "Gewicht",
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
      label: info.label,
      unit: "cm",
      color: info.color,
      points: sorted
        .map((c) => ({ on: c.weekOf, value: c[info.field] as number | null }))
        .filter((p): p is { on: string; value: number } => p.value !== null),
    };
  });

  return [weight, ...measures].filter((s) => s.points.length > 0);
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

  const measured = history
    .filter((c) => MEASURE_KEYS.some((k) => c[MEASURE_INFO[k].field] !== null))
    .map((c) => c.weekOf)
    .sort();

  const last = measured[measured.length - 1];
  // Noch nie gemessen: gleich beim ersten Mal fragen.
  if (!last) return true;
  // In dieser Woche schon gemessen: Felder bleiben sichtbar, damit man
  // korrigieren kann.
  if (last === thisWeekOf) return true;

  const weeks = Math.round(
    (new Date(`${thisWeekOf}T00:00:00`).getTime() -
      new Date(`${last}T00:00:00`).getTime()) /
      (7 * 86_400_000),
  );
  return weeks >= fields.measureEveryWeeks;
}
