/**
 * Sätze zu den Zahlen der Engine.
 *
 * Die Engine rechnet nur noch und liefert Daten (BeatsBest,
 * VolumeChange); was davon in der Oberfläche steht, steht hier. Haltung
 * wie bisher: nüchtern, ohne Ausrufezeichen. Die App liefert die Zahl,
 * die Bewertung gehört dem Trainer — und wer nach vier Wochen Pause
 * zurückkommt, soll sich nicht angeschrien fühlen.
 */
import type { BeatsBest, Insight, VolumeChange } from "@ptfive/coach-engine";
import { formats } from "../../format";
import { labels } from "./labels";

/** Was eine Hinweiskarte im Feed zeigt. */
export interface InsightText {
  title: string;
  body: string;
  /** Konkreter nächster Schritt für den Coach, oder null. */
  action: string | null;
}

const f = formats("de");

export const engine = {
  units: { kg: "kg", reps: "Wdh.", cm: "cm" },
  /** „12.400 kg" — einheitlich in beiden Oberflächen. */
  volume: (kg: number): string => `${f.integer(kg)} kg`,
  best: (b: BeatsBest): string =>
    b.isFirst ? "Erste Leistung in dieser Übung" : `Neue Bestleistung · +${b.percent} %`,
  /** Kurz, für die Zusammenfassung am Ende der Einheit. */
  bestShort: (b: BeatsBest): string => (b.isFirst ? "Erstes Mal" : `+${b.percent} %`),
  insight: (i: Insight, name: string): InsightText => {
    const muster = i.pattern ? labels.pattern[i.pattern] : labels.patternCore;
    const f = i.facts;
    if (f.kind === "plateau") {
      return {
        title: `${muster} steht seit ${f.window} Einheiten`,
        body: `${name} macht in diesem Muster keinen messbaren Fortschritt mehr. Normal — jetzt einen Hebel wählen.`,
        action:
          "Volumen erhöhen, Intensitätstechnik einsetzen, Übungsvariation wählen oder Equipment wechseln. Muster beibehalten, Winkel ändern.",
      };
    }
    if (f.kind === "inactive") {
      return f.daysSince === null
        ? {
            title: "Noch kein Training geloggt",
            body: `${name} hat seit dem Start noch nichts geloggt.`,
            action: "Kurze Nachricht schicken und den nächsten Termin bestätigen.",
          }
        : {
            title: `Seit ${f.daysSince} Tagen kein Training geloggt`,
            body: `Letzte Einheit von ${name} liegt ${f.daysSince} Tage zurück.`,
            action: "Kurze Nachricht schicken und den nächsten Termin bestätigen.",
          };
    }
    return {
      title: `${muster}: plus ${f.growthPercent} Prozent`,
      body: `${name} hat sich gegenüber der letzten Einheit gesteigert.`,
      action: null,
    };
  },
  volumeChange: (c: VolumeChange): string => {
    if (!c.previous) {
      return c.current.volumeKg > 0
        ? "Erstes Mal an diesem Tag — das ist deine Marke."
        : "Erstes Mal an diesem Tag.";
    }
    if (c.percent === null) return "Vorher ohne Gewicht — kein Vergleich möglich.";
    if (c.percent === 0) return "Genauso viel wie letztes Mal.";
    const kg = f.integer(Math.abs(c.deltaKg));
    return c.percent > 0
      ? `${c.percent} % mehr als letztes Mal (+${kg} kg)`
      : `${Math.abs(c.percent)} % weniger als letztes Mal (−${kg} kg)`;
  },
};
