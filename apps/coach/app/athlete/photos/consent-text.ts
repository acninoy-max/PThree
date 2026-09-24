/**
 * Der Einwilligungstext.
 *
 * ACHTUNG — DIESER TEXT IST NOCH NICHT ANWALTLICH GEPRÜFT.
 *
 * Er steht hier, damit die Testversion nicht ohne Einwilligung läuft,
 * und er nennt die Dinge, die eine Einwilligung nach Art. 7 und Art. 9
 * DSGVO nennen muss: wer, was, wofür, wie lange, und wie man sie
 * zurücknimmt. Bevor der erste echte Klient sich anmeldet, muss ein
 * Anwalt darüber schauen — er sieht ohnehin den Vorgründungsvertrag an.
 *
 * Wird der Text geändert, steigt `CONSENT_VERSION` in `actions.ts` auf
 * "v2". Die Fassung steht an jeder Einwilligung; so bleibt belegbar,
 * wer welchem Text zugestimmt hat. Das ist der Grund, warum die
 * Einwilligung eine eigene Tabelle hat und kein Häkchen am Klienten
 * ist.
 */

/**
 * Fassung des Textes. Steht an jeder erteilten Einwilligung.
 *
 * Wohnt hier und nicht in `actions.ts`: Aus einer `"use server"`-Datei
 * darf nur exportiert werden, was eine asynchrone Funktion ist. Eine
 * Konstante dort bricht erst beim Bauen, nicht beim Typprüfen — also
 * genau dann, wenn man sie am wenigsten erwartet.
 */
export const CONSENT_VERSION = "v1";

export const CONSENT_TITLE = "Fotos vom eigenen Körper";

export const CONSENT_POINTS = [
  {
    frage: "Worum geht es?",
    text:
      "Du kannst Fotos von dir hochladen, um deine Entwicklung über die " +
      "Zeit zu sehen. Das ist freiwillig — alles andere in der App " +
      "funktioniert auch ohne.",
  },
  {
    frage: "Wer sieht die Bilder?",
    text:
      "Nur du und der Trainer, der dich betreut. Sonst niemand. Sie " +
      "erscheinen in keiner Auswertung, in keiner Statistik und werden " +
      "nicht weitergegeben.",
  },
  {
    frage: "Wo liegen sie?",
    text:
      "In einem abgeschlossenen Speicher. Die Bilder sind nicht über " +
      "eine offene Adresse erreichbar; die Links, über die sie angezeigt " +
      "werden, laufen nach einer Stunde ab.",
  },
  {
    frage: "Was passiert mit dem Aufnahmeort?",
    text:
      "Der wird entfernt. Handyfotos tragen normalerweise GPS-Daten, " +
      "Gerät und Uhrzeit im Bild. Beim Hochladen wird das Bild neu " +
      "berechnet, und diese Angaben bleiben auf deinem Gerät.",
  },
  {
    frage: "Wie lange?",
    text:
      "So lange du willst. Du kannst einzelne Bilder löschen oder die " +
      "Einwilligung ganz zurücknehmen — dann werden alle Bilder sofort " +
      "gelöscht, nicht nur ausgeblendet.",
  },
  {
    frage: "Was sind das für Daten?",
    text:
      "Körperfotos gelten als Gesundheitsdaten (Art. 9 DSGVO). Deshalb " +
      "fragen wir ausdrücklich und nicht nebenbei im Kleingedruckten.",
  },
] as const;

export const CONSENT_SUMMARY =
  "Ich bin damit einverstanden, dass meine Fotos gespeichert und meinem " +
  "Trainer angezeigt werden. Ich kann das jederzeit zurücknehmen.";
