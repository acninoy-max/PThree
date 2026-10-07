/**
 * Die Abschnitte der Klientenakte.
 *
 * Aus dem Meeting 16.09: „Zahnrad rechtsbündig ganz oben auf Klient um
 * sich das Klienten Fenster selber zu Bauen bzw anwählen abwählen der
 * Metriken weil sonst zu voll. Und auch selber Reihenfolge festlegen
 * können."
 *
 * Diese Liste ist die Wahrheit über die Reihenfolge (Beschriftung im
 * Wörterbuch). Die
 * Datenbank speichert nur Abweichungen davon — wer nie etwas einstellt,
 * bekommt genau diese Anordnung, und wer vor einem halben Jahr etwas
 * eingestellt hat, bekommt später hinzugekommene Abschnitte trotzdem zu
 * sehen.
 *
 * Nicht in der Liste: Plan, Termine und Verwaltung. Das ist keine
 * Auslassung — es ist die Steuerung der Akte und nicht ihr Inhalt. Einen
 * Plan zuweisen zu können, darf nicht davon abhängen, dass man vor drei
 * Wochen die richtige Einstellung getroffen hat.
 */

/** Beschriftung und Erklärung: t.coach.sections. */
export const SECTIONS = [
  { key: "goal" },
  { key: "insights" },
  { key: "checkins" },
  { key: "progress" },
  { key: "body" },
  { key: "photos" },
  { key: "volume" },
  { key: "sessions" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

/**
 * Die drei Reiter der Akte (Joëls Punkt 13, Nachtrag 06.10.): Tracken,
 * Check-ins, Progress. Jeder Abschnitt gehört zu genau einem. Die
 * Anordnung aus den Einstellungen gilt innerhalb des Reiters.
 *
 * „manage" ist kein Reiter in der Leiste, sondern die Seite hinter
 * „Stammdaten & Zugang" — selten gebraucht, deshalb nicht gleichrangig.
 */
export type ClientTab = "track" | "checkins" | "progress";
export const CLIENT_TABS: readonly ClientTab[] = ["track", "checkins", "progress"];
export type ClientView = ClientTab | "manage";

export const SECTION_TAB: Record<SectionKey, ClientTab> = {
  // Beim Trainieren braucht man die Ziele und das letzte Mal vor Augen.
  goal: "track",
  sessions: "track",
  checkins: "checkins",
  // Hinweise der Engine sind Aussagen über den Verlauf.
  insights: "progress",
  progress: "progress",
  body: "progress",
  photos: "progress",
  volume: "progress",
};

/** Reiter aus der Adresse. Unbekannt oder leer: Tracken. */
export function parseView(v: string | undefined): ClientView {
  return v === "checkins" || v === "progress" || v === "manage" ? v : "track";
}

export const SECTION_KEYS: SectionKey[] = SECTIONS.map((s) => s.key);

const BEKANNT = new Set<string>(SECTION_KEYS);

export interface StoredSection {
  section: string;
  position: number;
  isVisible: boolean;
}

/**
 * Gespeicherte Einstellung auf die tatsächliche Anordnung abbilden.
 *
 * Drei Fälle, und jeder einzelne ist schon einmal jemandem auf die Füße
 * gefallen:
 *
 * 1. **Nichts gespeichert** — Standardanordnung, alles sichtbar.
 * 2. **Ein Abschnitt fehlt in der Einstellung** — er ist neu dazu-
 *    gekommen. Er wird sichtbar ANGEHÄNGT, nicht weggelassen. Sonst
 *    bliebe jede Erweiterung für alle unsichtbar, die schon einmal
 *    etwas eingestellt haben, und niemand käme je darauf, warum.
 * 3. **Ein gespeicherter Schlüssel ist unbekannt** — ein Abschnitt, den
 *    es nicht mehr gibt. Wird still übergangen statt zu einem leeren
 *    Platz zu führen.
 * 4. **Ein Schlüssel kommt doppelt** — kann die Datenbank nicht
 *    liefern, der Schlüssel `(viewer_id, section)` verbietet es. Aber
 *    diese Funktion nimmt eine Liste entgegen, und käme ein Abschnitt
 *    doppelt durch, stünde er zweimal in der Akte, zweimal mit
 *    demselben React-Key. Der erste Platz gewinnt.
 */
export function resolveSections(stored: readonly StoredSection[]): {
  key: SectionKey;
  isVisible: boolean;
}[] {
  const gesehen = new Set<string>();
  const gespeichert: { key: SectionKey; isVisible: boolean }[] = [];

  for (const s of [...stored].sort((a, b) => a.position - b.position)) {
    if (!BEKANNT.has(s.section)) continue; // Fall 3
    if (gesehen.has(s.section)) continue; // Fall 4
    gesehen.add(s.section);
    gespeichert.push({ key: s.section as SectionKey, isVisible: s.isVisible });
  }

  return [
    ...gespeichert,
    // Fall 2: alles, wovon die Einstellung nichts weiss.
    ...SECTION_KEYS.filter((k) => !gesehen.has(k)).map((key) => ({
      key,
      isVisible: true,
    })),
  ];
}
