/**
 * Der Einwilligungstext für Fortschrittsfotos — in beiden Sprachen.
 *
 * ACHTUNG — WEDER DIE DEUTSCHE FASSUNG NOCH DIE ÜBERSETZUNG SIND
 * ANWALTLICH GEPRÜFT.
 *
 * Der Text nennt die Dinge, die eine Einwilligung nach Art. 7 und Art. 9
 * DSGVO nennen muss: wer, was, wofür, wie lange, und wie man sie
 * zurücknimmt. Bevor der erste echte Klient sich anmeldet, muss ein
 * Anwalt über BEIDE Fassungen schauen — die englische ist eine
 * Übersetzung, kein eigenständig geprüfter Text.
 *
 * Steht hier und nicht im Wörterbuch: Es ist ein Rechtstext mit eigener
 * Fassungsnummer, kein Oberflächentext. Wer ihn ändert, muss die Nummer
 * erhöhen — im Wörterbuch ginge das zwischen hundert Knopfbeschriftungen
 * unter.
 *
 * FASSUNG: `consentVersion(locale)` steht an jeder Einwilligung. Sie
 * trägt die Sprache mit, weil der Klient genau dem Text zugestimmt hat,
 * den er gelesen hat. Einwilligungen vor dem 07.10.2026 tragen „v1" —
 * das ist die deutsche Fassung, also gleichbedeutend mit „v1-de".
 *
 * Wird ein Text geändert, steigt TEXT_VERSION auf "v2" — für beide
 * Sprachen, damit Fassungen nicht auseinanderlaufen.
 */
import type { Locale } from "./locale";

/**
 * Wohnt hier und nicht in einer `actions.ts`: Aus einer
 * `"use server"`-Datei darf nur exportiert werden, was eine asynchrone
 * Funktion ist. Eine Konstante dort bricht erst beim Bauen.
 */
const TEXT_VERSION = "v1";

export function consentVersion(locale: Locale): string {
  return `${TEXT_VERSION}-${locale}`;
}

export interface ConsentText {
  title: string;
  points: { frage: string; text: string }[];
  summary: string;
}

export const CONSENT: Record<Locale, ConsentText> = {
  de: {
    title: "Fotos vom eigenen Körper",
    points: [
      {
        frage: "Worum geht es?",
        text: "Du kannst Fotos von dir hochladen, um deine Entwicklung über die Zeit zu sehen. Das ist freiwillig — alles andere in der App funktioniert auch ohne.",
      },
      {
        frage: "Wer sieht die Bilder?",
        text: "Nur du und der Trainer, der dich betreut. Sonst niemand. Sie erscheinen in keiner Auswertung, in keiner Statistik und werden nicht weitergegeben.",
      },
      {
        frage: "Wo liegen sie?",
        text: "In einem abgeschlossenen Speicher. Die Bilder sind nicht über eine offene Adresse erreichbar; die Links, über die sie angezeigt werden, laufen nach einer Stunde ab.",
      },
      {
        frage: "Was passiert mit dem Aufnahmeort?",
        text: "Der wird entfernt. Handyfotos tragen normalerweise GPS-Daten, Gerät und Uhrzeit im Bild. Beim Hochladen wird das Bild neu berechnet, und diese Angaben bleiben auf deinem Gerät.",
      },
      {
        frage: "Wie lange?",
        text: "So lange du willst. Du kannst einzelne Bilder löschen oder die Einwilligung ganz zurücknehmen — dann werden alle Bilder sofort gelöscht, nicht nur ausgeblendet.",
      },
      {
        frage: "Was sind das für Daten?",
        text: "Körperfotos gelten als Gesundheitsdaten (Art. 9 DSGVO). Deshalb fragen wir ausdrücklich und nicht nebenbei im Kleingedruckten.",
      },
    ],
    summary:
      "Ich bin damit einverstanden, dass meine Fotos gespeichert und meinem Trainer angezeigt werden. Ich kann das jederzeit zurücknehmen.",
  },
  en: {
    title: "Photos of your own body",
    points: [
      {
        frage: "What is this about?",
        text: "You can upload photos of yourself to see how you change over time. This is optional — everything else in the app works without it.",
      },
      {
        frage: "Who sees the photos?",
        text: "Only you and the coach who works with you. Nobody else. They don't appear in any report or statistic and are never passed on.",
      },
      {
        frage: "Where are they stored?",
        text: "In a closed storage area. The photos can't be reached through a public address; the links used to display them expire after one hour.",
      },
      {
        frage: "What happens to the location?",
        text: "It is removed. Phone photos usually carry GPS data, device and time inside the image. When uploading, the image is re-rendered and this information stays on your device.",
      },
      {
        frage: "For how long?",
        text: "As long as you want. You can delete single photos or withdraw your consent entirely — then all photos are deleted immediately, not just hidden.",
      },
      {
        frage: "What kind of data is this?",
        text: "Body photos count as health data (Art. 9 GDPR). That's why we ask explicitly and not in the small print.",
      },
    ],
    summary:
      "I agree that my photos are stored and shown to my coach. I can withdraw this at any time.",
  },
};
