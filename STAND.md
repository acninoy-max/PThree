# Stand und Weg zum Testbetrieb

Stand: 23. September 2026.

Zwei verschiedene Fragen, die oft vermischt werden:

1. **Läuft es?** — Ja, auf deinem Mac, mit dir und Joel als Testkonten.
2. **Kann Joel damit einen echten Klienten betreuen?** — Noch nicht. Was
   dazwischen liegt, steht weiter unten, und es ist weniger, als man
   denkt.

---

## Was steht

**20 Migrationen, 20 Seiten, rund 23.000 Zeilen Code, 77 Übungen in der
Bibliothek.**

### Trainerseite

- Klientenverwaltung mit Einladungslink, Zielen und Notizen
- Plan-Builder: Slots aus Muskelgruppe und Block, Supersätze, Tempo,
  Satzpausen, betreute Tage, Wochentage (auch mehrfach pro Woche)
- Übungsbibliothek mit eigenen Übungen, Muskelgruppen und Nebengruppen
- Wochen- und Monatskalender mit Terminen
- Check-in-Posteingang mit Antwortfunktion
- Fortschritt pro Übung je Klient, mit eigener Auswahl — wahlweise als
  Bestleistung oder als Gesamtvolumen der Übung
- Volumen je Trainingstag
- **Tracken am Handy**: Sätze für den Klienten eintragen, mit
  Trainingsuhr und Satzpausentimer wie auf der Athletenseite
- **Zahnrad in der Klientenakte**: Abschnitte an- und abwählen,
  Reihenfolge selbst festlegen — gilt für alle Klienten

### Athletenseite

- Tagesdashboard, Wochenplan mit Wochentagen
- Trainingsausführung: Ziffernblock, Übernahme der letzten Last,
  Übungstausch im Slot, Pausen-Timer mit Ton und Vibration,
  Bildschirmsperre verhindern
- Wöchentliches Check-in mit Körpermaßen nach Rhythmus
- Fortschritt pro Übung, selbst gewählt, Bestleistung oder Volumen
- Körpergewicht zählt als Last — Klimmzüge haben eine echte Kurve
- **Fortschrittsfotos** mit Vorher-Nachher nebeneinander

### Der Feinschliff

Vier Dinge, die keine Funktion ändern und trotzdem den Unterschied
machen zwischen „gebaut" und „zusammengesteckt":

**Ein Schriftraster.** Vorher standen zwanzig verschiedene Größen im
Code — 12, 12,5, 13, 13,5, 14, 14,5 und so weiter. Der Unterschied
zwischen 13 und 13,5 ist für sich unsichtbar; zwanzig solcher
Entscheidungen nebeneinander ergeben ein Bild ohne Raster. Jetzt acht
Stufen plus drei begründete Ausnahmen, alle als Token, und
`check-scale.mjs` meldet die einundzwanzigste.

**Rückmeldung beim Antippen.** Jede antippbare Fläche antwortet sofort,
nicht erst wenn der Server reagiert. Deaktivierte Knöpfe bewegen sich
bewusst nicht — eine Rückmeldung auf etwas Totem ist schlimmer als
keine.

**Der Bestleistungs-Moment.** Trägt der Athlet einen Satz über der alten
Marke ein, steht es im selben Augenblick in der Zeile. Mit einer
Schwelle von einem Prozent: Epley reagiert auf jedes Gramm, und ohne
Schwelle wäre jeder zweite Satz ein Rekord. Am Ende sammelt der
Abschlussschirm, welche Übungen heute eine neue Marke gesehen haben —
je Übung einmal.

**Bestätigungen.** Check-in beantwortet, Ansicht übernommen, Bild
gespeichert: Es steht kurz unten. Vorher lud die Seite still neu, und
wer nicht sicher war, tippte ein zweites Mal.

### Beim Öffnen

Startet die App vom Homescreen, kommt zuerst ein sandfarbener Schirm mit
dem Logo — kein weißer Blitz. iOS liest dafür nicht das Manifest,
sondern verlangt je Gerät ein eigenes Bild; neun davon liegen unter
`public/startup/`, erzeugt von `scripts/startup-images.py`.

Danach wird die Marke von links nach rechts aufgedeckt, eine rote Kante
läuft voraus. Knapp eine Sekunde, **reines CSS**: Eine Startanimation,
die per JavaScript ausgeblendet wird, bleibt bei einem Skriptfehler für
immer stehen — und dann ist die App nicht kaputt, sondern unerreichbar.

### Fotos

Der Punkt aus dem Meeting 16.09 steht: Der Athlet lädt Bilder hoch
(vorne, Seite, hinten), sieht sie nebeneinander, und darunter steht die
Spanne und die Gewichtsdifferenz — „12 Wochen · −6,5 kg". Der Trainer
sieht dasselbe in der Akte.

Vier Dinge daran sind bewusst so und nicht anders:

- **Ohne Einwilligung kein Upload, erzwungen von der Datenbank.** Die
  App fragt zwar auch, aber die App ist die schwächere Stelle. Die
  Bedingung steht in der Schreibregel; ohne Zustimmung verweigert
  Postgres die Zeile.
- **Nur der Athlet willigt ein und nur er lädt hoch.** Der Trainer
  sieht. Eine Einwilligung, die ein anderer erteilt, ist keine.
- **Widerruf löscht wirklich** — Dateien und Zeilen, nicht ausblenden.
- **Der Aufnahmeort bleibt auf dem Gerät.** Das Bild wird im Browser
  verkleinert; dabei fallen EXIF-Daten samt GPS weg. Ein Körperfoto von
  zu Hause trägt sonst die Koordinaten der Wohnung mit.

Der Einwilligungstext in der App ist **noch nicht anwaltlich geprüft** —
siehe Punkt 4 unten.

### In jeder Kurve

Seit dem 16.09-Meeting steht die Veränderung als Zahl am Ende der Linie
und noch einmal am Chip darunter: „−15 kg", „+2,5 kg", „±0 kg". Sie
bezieht sich immer auf den **gewählten Zeitraum** und ändert sich mit
dem Umschalter — eine Zahl, die etwas anderes misst als das Bild, wäre
schlimmer als keine.

Bewusst ohne Grün und Rot. −15 kg auf der Waage ist ein Erfolg, −15 kg
beim Bankdrücken das Gegenteil, und beides steht auf derselben Seite.
Das Vorzeichen sagt, was passiert ist; ob das gut war, weiß der Mensch
davor.

### Unter der Oberfläche

- Zeilensicherheit auf allen Tabellen; die App filtert nie selbst nach
  Klient, die Datenbank verweigert es
- Check-in-Schutz per Trigger: Der Trainer kann die Angaben seines
  Klienten nicht überschreiben, `coach_replied_at` setzt der Server
- **120 Tests** (93 Engine, 27 App), fünf eigene Prüfer für SQL,
  Datumsformate, Layout, Server Actions und das Schriftraster, und ein
  vollständiger TypeScript-Durchlauf über alle 86 App-Dateien

---

## Was für einen echten Test fehlt

Vier Punkte. Der erste ist der eigentliche.

### 1. Die App läuft nur auf deinem Mac

Das ist die Lücke, die alles andere blockiert. Solange `npm run dev` auf
deinem Laptop laufen muss und die Adresse eine Hotspot-IP ist, kann Joel
nicht mit einem Klienten arbeiten — nicht am nächsten Tag, nicht ohne
dich, nicht von unterwegs.

**Was es braucht:** Die App auf Vercel ausrollen (Next.js kommt von dort,
das ist ein Nachmittag), eine Domain, und die drei Umgebungsvariablen
setzen. Supabase läuft ohnehin schon in der Cloud — die Daten sind nicht
das Problem, nur die Anwendung.

Damit fällt auch die IP-Sucherei weg, die im Testlauf drei Fußnoten
kostet.

### 2. Passwort vergessen

Anmeldung läuft über E-Mail und Passwort. Wer seines vergisst — und das
passiert in jeder Beta —, kommt nicht mehr rein, und du müsstest ihn in
Supabase von Hand zurücksetzen. Supabase kann das eingebaut; es fehlt die
Seite dazu und eine Route, die den Link entgegennimmt.

Halber Tag.

### 3. Wenn etwas kaputtgeht, sieht der Nutzer einen Absturz

Es gibt keine Fehlerseite und keine 404-Seite. Bricht eine Abfrage weg,
zeigt Next im Betrieb eine leere weiße Seite. In der Beta willst du
stattdessen „Da ist etwas schiefgelaufen" und einen Weg zurück — sonst
bekommst du als Rückmeldung „die App ist kaputt" ohne jeden Hinweis
darauf, was.

Zwei Stunden.

### 4. Datenschutzerklärung und Einwilligung

Sobald ein echter Klient seine Daten einträgt, gilt die DSGVO. In der App
verarbeitet ihr Gesundheitsdaten nach Art. 9 — Gewicht, Körpermaße,
Trainingsverhalten, **und seit heute Fotos**. Dafür braucht es eine
Einwilligung und eine Datenschutzerklärung, und zwar bevor der erste
echte Klient sich anmeldet, nicht danach.

Der Ablauf steht: Die App zeigt den Einwilligungstext, hält Erteilung
und Widerruf mit Zeitstempel und Textfassung fest, und ohne gültige
Einwilligung verweigert die Datenbank jeden Upload.

**Was fehlt, ist der geprüfte Text.** Der in der App
(`app/athlete/photos/consent-text.ts`) nennt alles, was eine
Einwilligung nach Art. 7 und Art. 9 nennen muss — wer, was, wofür, wie
lange, wie zurücknehmen —, ist aber von mir geschrieben und nicht von
einem Anwalt. Er gehört in dieselbe Runde wie der
Vorgründungsvertrag. Ändert sich der Text, steigt `CONSENT_VERSION` auf
„v2"; die Fassung steht an jeder erteilten Einwilligung, also bleibt
belegbar, wer welchem Text zugestimmt hat.

Dazu offen: eine **Löschfrist**, wenn die Betreuung endet. Heute bleiben
die Bilder, bis jemand widerruft.

Kein Programmierpunkt, sondern einer für den Anwalt. Die
Datenschutzseite selbst ist dann eine Stunde Arbeit.

---

## Was ich bewusst NICHT zum Testen zähle

Diese Dinge fehlen, halten aber keinen Test auf:

- **Ketten-QA-Dashboard** — die Verkaufsgeschichte Richtung Trainmore.
  Für einen Test mit Joels eigenen Klienten irrelevant.
- **Zahlungen über Mollie** — in der Beta zahlt niemand.
- **Chat, Ziele mit Zielwerten** — gute Features, aber der Test soll
  zeigen, ob die Schleife aus Plan, Training, Check-in und Antwort im
  Alltag trägt. Dafür reicht, was da ist.
- **Anleitungen zu den Körpermaßen** — ein Satz pro Maß im Formular.
  Wenig Arbeit, aber es entscheidet darüber, ob die Zahlen etwas wert
  sind: Taille am Bauchnabel oder an der schmalsten Stelle
  unterscheidet sich um 3–5 cm, und wer jede Woche anders misst, dessen
  „Fortschritt" ist Rauschen.
- **Apple Health, MyFitnessPal, InBody** — geparkt, teils nur mit
  nativer App möglich.

---

## Vorschlag für die Reihenfolge

1. **Ausrollen** (Punkt 1). Danach kann Joel überhaupt erst anfangen.
2. **Fehlerseite und Passwort-Reset** (Punkte 3 und 2). Zusammen ein Tag,
   und beides merkt man erst, wenn es fehlt.
3. **Datenschutz und Einwilligungstext** (Punkt 4) in einer Runde mit
   dem Anwalt klären — die Fotos gehören dort hinein.
4. Erst dann der erste echte Klient.

Zwischen heute und „Joel betreut damit jemanden" liegen also etwa
**anderthalb Arbeitstage plus die Anwaltsrunde** — nicht Wochen.

Offen bleibt außerdem, was du selbst auf der Liste führst und wovon ich
den Inhalt nicht kenne: **die Kleinigkeiten aus dem Meeting 19.06.** Die
stehen in keinem Dokument in diesem Ordner.

---

## Womit ihr vorher testen solltet

`TESTLAUF.md`. Vor dem ersten echten Klienten sollte der einmal
komplett durchlaufen, mit dir als Trainer und Joel als Athlet — und
danach einmal andersherum, damit Joel die Trainerseite aus eigener Hand
kennt.

Zwei bekannte Grenzen stehen dort als eigener Abschnitt, damit sie nicht
als Fehler gemeldet werden: der Pausen-Ton bei gesperrtem iPhone und
Körpergewichtsübungen ohne gemeldetes Gewicht.

## Was vor jedem Testlauf läuft

Vier Befehle, alle ohne laufenden Server:

```
node apps/coach/check-format.mjs        # Datumsformate
node apps/coach/check-layout.mjs        # Inline-Styles gegen Media-Queries
node apps/coach/check-actions.mjs       # Exporte aus "use server"-Dateien
python3 supabase/check_sql.py           # SQL
bash packages/coach-engine/run-tests.sh # 83 Engine-Tests
bash apps/coach/run-tests.sh            # 27 App-Tests
```

Dazu einmal `npx tsc -p apps/coach/tsconfig.json --noEmit`. Das ist der
breiteste Prüfer von allen — er geht über alle 75 App-Dateien und hat
in dieser Runde mehrere Fehler gefunden, bevor sie im Studio auffallen
konnten.

`npx next build` läuft in der Sandbox nicht und muss vor jedem Ausrollen
einmal auf einem echten Rechner durch.
