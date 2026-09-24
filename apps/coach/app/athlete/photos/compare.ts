/**
 * Der Vergleich zweier Aufnahmen.
 *
 * Joels Satz aus dem Meeting: „Boa seh besser aus als vor nem Monat."
 * Das ist der ganze Zweck. Eine Galerie allein leistet das nicht — man
 * scrollt, sieht zwölf ähnliche Bilder und erkennt nichts. Nebeneinander
 * gestellt sieht man es sofort.
 *
 * Bewusst ohne React: So lässt sich das hier ohne Browser durchrechnen,
 * und die Fälle, die wehtun, stehen als Tests daneben.
 */

export type Pose = "front" | "side" | "back";

export const POSES: { key: Pose; label: string }[] = [
  { key: "front", label: "Vorne" },
  { key: "side", label: "Seite" },
  { key: "back", label: "Hinten" },
];

export interface PhotoLike {
  id: string;
  /** YYYY-MM-DD. */
  takenOn: string;
  pose: Pose;
}

export interface WeightPoint {
  /** YYYY-MM-DD. */
  on: string;
  kg: number;
}

export function poseLabel(pose: Pose): string {
  return POSES.find((p) => p.key === pose)?.label ?? pose;
}

/** Tag aus YYYY-MM-DD, als lokale Mitternacht. */
function tag(iso: string): Date {
  const [j, m, t] = iso.slice(0, 10).split("-").map(Number);
  return new Date(j ?? 1970, (m ?? 1) - 1, t ?? 1);
}

/**
 * Ganze Wochen zwischen zwei Tagen.
 *
 * Abgerundet: „nach 3 Wochen" ist nach 20 Tagen eine Übertreibung.
 * Unter sieben Tagen wird in Tagen gezählt — siehe `spanLabel`.
 */
export function weeksBetween(von: string, bis: string): number {
  const tage = Math.round(
    (tag(bis).getTime() - tag(von).getTime()) / 86_400_000,
  );
  return Math.floor(Math.abs(tage) / 7);
}

/** Ganze Tage zwischen zwei Tagen. */
export function daysBetween(von: string, bis: string): number {
  return Math.abs(
    Math.round((tag(bis).getTime() - tag(von).getTime()) / 86_400_000),
  );
}

/** „12 Wochen" / „5 Tage" / „heute" */
export function spanLabel(von: string, bis: string): string {
  const tage = daysBetween(von, bis);
  if (tage === 0) return "derselbe Tag";
  if (tage < 7) return `${tage} ${tage === 1 ? "Tag" : "Tage"}`;
  const wochen = Math.floor(tage / 7);
  return `${wochen} ${wochen === 1 ? "Woche" : "Wochen"}`;
}

/**
 * Das Gewicht, das einem Tag am nächsten liegt.
 *
 * Nicht „das Gewicht an diesem Tag": Der Athlet fotografiert am Sonntag
 * und meldet am Montag. Eine exakte Übereinstimmung zu verlangen hieße,
 * fast immer nichts anzuzeigen.
 *
 * Die Obergrenze verhindert das Gegenteil: Ein Check-in von vor einem
 * halben Jahr neben ein Foto von heute zu stellen wäre schlicht falsch.
 */
export function nearestWeight(
  weights: readonly WeightPoint[],
  on: string,
  maxAbstandTage = 21,
): number | null {
  let beste: WeightPoint | null = null;
  let besterAbstand = Infinity;

  for (const w of weights) {
    const abstand = daysBetween(w.on, on);
    if (abstand < besterAbstand) {
      besterAbstand = abstand;
      beste = w;
    }
  }

  if (!beste || besterAbstand > maxAbstandTage) return null;
  return beste.kg;
}

/** Fotos einer Ansicht, älteste zuerst. */
export function byPose<T extends PhotoLike>(
  photos: readonly T[],
  pose: Pose,
): T[] {
  return photos
    .filter((p) => p.pose === pose)
    .sort((a, b) => a.takenOn.localeCompare(b.takenOn));
}

/** Welche Ansichten überhaupt Bilder haben. */
export function availablePoses(photos: readonly PhotoLike[]): Pose[] {
  return POSES.map((p) => p.key).filter((k) =>
    photos.some((p) => p.pose === k),
  );
}

export interface Comparison<T> {
  before: T;
  after: T;
  /** „12 Wochen" */
  span: string;
  /** Gewichtsunterschied in kg, oder null ohne passende Check-ins. */
  weightDelta: number | null;
}

/**
 * Der voreingestellte Vergleich einer Ansicht: ältestes gegen neuestes.
 *
 * Nicht „die letzten beiden": Zwei Aufnahmen im Abstand einer Woche
 * unterscheiden sich nicht sichtbar, und ein Vergleich, in dem man
 * nichts sieht, entmutigt. Der größte Abstand zeigt das meiste.
 *
 * Null bei weniger als zwei Bildern — ein Vergleich braucht zwei.
 */
export function defaultComparison<T extends PhotoLike>(
  photos: readonly T[],
  pose: Pose,
  weights: readonly WeightPoint[] = [],
): Comparison<T> | null {
  const reihe = byPose(photos, pose);
  if (reihe.length < 2) return null;

  const before = reihe[0]!;
  const after = reihe[reihe.length - 1]!;
  return buildComparison(before, after, weights);
}

/** Vergleich aus zwei bestimmten Aufnahmen. */
export function buildComparison<T extends PhotoLike>(
  before: T,
  after: T,
  weights: readonly WeightPoint[] = [],
): Comparison<T> {
  const vorher = nearestWeight(weights, before.takenOn);
  const nachher = nearestWeight(weights, after.takenOn);

  return {
    before,
    after,
    span: spanLabel(before.takenOn, after.takenOn),
    // Nur wenn BEIDE Seiten ein Gewicht haben. Eine Differenz gegen
    // eine fehlende Zahl ist keine Differenz.
    weightDelta:
      vorher !== null && nachher !== null
        ? Math.round((nachher - vorher) * 10) / 10
        : null,
  };
}
