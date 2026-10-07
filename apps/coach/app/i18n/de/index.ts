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
import { formats } from "@/app/format";
import { auth } from "./auth";
import { fehler } from "./fehler";

export const de = {
  fmt: formats("de"),

  common: {
    appName: "PTHREE",
    save: "Speichern",
    saving: "Wird gespeichert …",
    cancel: "Abbrechen",
    close: "Schließen",
    delete: "Löschen",
    back: "Zurück",
    later: "Später",
    signOut: "Abmelden",
    toHome: "PTHREE — zur Startseite",
    metaDescription: "Das Betriebssystem für freelance Personal Trainer",
  },

  auth,
  fehler,

  language: {
    label: "Sprache",
    en: "English",
    de: "Deutsch",
  },
};

export type Dict = typeof de;
