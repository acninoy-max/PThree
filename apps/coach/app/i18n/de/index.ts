/**
 * Alle Texte der Oberfläche, Deutsch.
 *
 * Diese Datei gibt die FORM vor: `Dict` ist ihr Typ, und die englische
 * Fassung muss genau ihn erfüllen. Fehlt dort ein Schlüssel, meldet es
 * `tsc` — nicht erst ein Nutzer, der einen leeren Knopf sieht.
 *
 * Abhängige Texte sind Funktionen (Mehrzahl, eingesetzte Namen). Das
 * geht, weil die Wörterbücher importiert und nie als Prop vom Server an
 * den Browser gereicht werden — Funktionen ließen sich nicht übertragen.
 */
import { formats } from "../../format";
import { auth } from "./auth";
import { fehler } from "./fehler";
import { labels } from "./labels";
import { athlete } from "./athlete";
import { engine } from "./engine";
import { coach } from "./coach";

export const de = {
  /** Für `localeCompare` und `lang`-Attribute. */
  locale: "de" as string,
  fmt: formats("de"),

  common: {
    appName: "PTHREE",
    save: "Speichern",
    saving: "Wird gespeichert …",
    savingShort: "Wird gespeichert",
    cancel: "Abbrechen",
    close: "Schließen",
    delete: "Löschen",
    back: "Zurück",
    later: "Später",
    signOut: "Abmelden",
    toHome: "PTHREE — zur Startseite",
    metaDescription: "Das Betriebssystem für freelance Personal Trainer",
    tempo: "Tempo",
    rest: "Pause",
    noFixedDay: "ohne festen Tag",
    guided: "mit Trainer",
    alone: "allein",
  },

  auth,
  fehler,
  labels,
  athlete,
  engine,
  coach,

  time: {
    /** Wie lange ein Plan schon läuft — zu `daysSince` in plan-week.ts. */
    since: (days: number): string => {
      if (days === 0) return "seit heute";
      if (days === 1) return "seit gestern";
      if (days === -1) return "ab morgen";
      if (days < 0) return `startet in ${-days} Tagen`;
      if (days < 14) return `seit ${days} Tagen`;
      const weeks = Math.floor(days / 7);
      if (weeks < 9) return `seit ${weeks} Wochen`;
      return `seit ${Math.round(days / 30.44)} Monaten`;
    },
    /** „gut 1 Std." liest sich besser als „62 Min". */
    duration: (minutes: number): string => {
      if (minutes === 0) return "—";
      if (minutes < 60) return `${minutes} Min`;
      if (minutes < 70) return "gut 1 Std.";
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m === 0 ? `${h} Std.` : `${h}:${String(m).padStart(2, "0")} Std.`;
    },
    /** Abstand zweier Aufnahmen: „12 Wochen", „5 Tage". Abgerundet —
     *  „nach 3 Wochen" ist nach 20 Tagen eine Übertreibung. */
    span: (tage: number): string => {
      if (tage === 0) return "derselbe Tag";
      if (tage < 7) return `${tage} ${tage === 1 ? "Tag" : "Tage"}`;
      const w = Math.floor(tage / 7);
      return `${w} ${w === 1 ? "Woche" : "Wochen"}`;
    },
    /** „ca." vor einer geschätzten Dauer. */
    approx: "ca.",
    minutes: "Minuten",
    /** ISO-Reihenfolge, Montag zuerst — wie `weekdays` in der Datenbank. */
    weekdayShort: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    weekdayLong: [
      "Montag", "Dienstag", "Mittwoch", "Donnerstag",
      "Freitag", "Samstag", "Sonntag",
    ],
  },

  chart: {
    ranges: { "1m": "1 Monat", "3m": "3 Monate", all: "Alles" },
    aria: (namen: string) => `Verlauf von ${namen}`,
    since: "seit",
    metrics: { best: "Bestleistung", volume: "Volumen" },
    metricHint: {
      best: "Bester Satz je Einheit, umgerechnet auf ein Einer-Maximum.",
      volume:
        "Alle Sätze je Einheit zusammen — Last mal Wiederholungen. Übungen ohne bezifferbare Last zählen in Wiederholungen.",
    },
  },

  compare: {
    noPhoto: "Noch kein Bild.",
    needTwo: "Erst ein Bild in dieser Ansicht — ein Vergleich braucht zwei.",
    before: "Vorher",
    after: "Nachher",
    notLoadable: "nicht ladbar",
    pick: (seite: string) => `${seite}: Aufnahme wählen`,
  },

  nav: {
    main: "Hauptnavigation",
    feed: "Feed",
    clients: "Klienten",
    calendar: "Kalender",
    exercises: "Übungen",
    today: "Heute",
    plan: "Plan",
    progress: "Fortschritt",
    profile: "Profil",
  },

  language: {
    label: "Sprache",
    en: "English",
    de: "Deutsch",
  },
};

export type Dict = typeof de;
