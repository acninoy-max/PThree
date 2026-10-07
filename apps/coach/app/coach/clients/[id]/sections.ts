/**
 * Die Abschnitte der Klientenakte.
 *
 * Aus dem Meeting 16.09: „Zahnrad rechtsbündig ganz oben auf Klient um
 * sich das Klienten Fenster selber zu Bauen bzw anwählen abwählen der
 * Metriken weil sonst zu voll. Und auch selber Reihenfolge festlegen
 * können."
 *
 * Diese Liste ist die Wahrheit über die Reihenfolge (Beschriftung im
 * Wörterbuch). Seit die Akte in Reitern steht, ist sie fest: Die
 * Einstellung „Ansicht" (0019, Tabelle client_view_sections) ist
 * entfernt — mit drei Reitern war das Ein- und Ausblenden einzelner
 * Abschnitte doppelt gemoppelt. Die Tabelle bleibt in der Datenbank,
 * wird aber nicht mehr gelesen.
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
