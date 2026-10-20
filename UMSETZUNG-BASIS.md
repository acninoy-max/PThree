# Basis auf 100 % — Umsetzungsplan nach den ersten Tests (15.10. + 20.10.)

**Stand 20.10.2026:** Schritt 1 umgesetzt (A1 Zwischenspeicher, A2
Supersätze per 0030, B4 Startwerte, A5 Geburtsdatum). Schritt 2
umgesetzt (B1 Nächste Schritte, B2 Planname, B6 Feed-Kacheln). Aus Schritt 3
umgesetzt: B3 Save as program, B5 Startgewicht, B7 Notizen je Übung
(alle mit 0031). Offen: A4 Textpass.

## Context

Die ersten Testtrainer (Shawn, Adri, Joël mit Klienten) sind durch. Die
Rückmeldung ist durchweg positiv, mit **einem echten Datenverlust**
(Training weg, wenn man die Seite verlässt) und einer Reihe von Reibungen
im Trainer-Alltag. Die Ketten-Ideen (Lead-Marktplatz, Retention, Case
Studies, Trainmore-Templates) werden bewusst hinten angestellt: Erst muss
die Basis so sitzen, dass Trainer die App freiwillig täglich nutzen.

Bestätigt beim Durchsehen des Codes:
- Es gibt **keinerlei Zwischenspeicher** beim Tracken — weder
  `athlete/log/client.tsx` noch `coach/track/[clientId]/track-client.tsx`
  nutzen localStorage. Seite verlassen = Training weg.
- `moveSlotAction` (`app/coach/plans/actions.ts:520`) tauscht nur mit
  dem direkten Nachbarn, kennt keine Supersätze und liest das Ergebnis
  nicht zurück (Regel 3).

Entscheidungen aus der Rückfrage:
- **PAR-Q füllt der Klient in seiner App aus**, der Trainer sieht es in
  der Akte.
- **Übungsnamen überall Englisch**, auch in der deutschen Oberfläche.
- **„Rote Bar über einem Textfeld"** ist unklar → Joël um Screenshot
  bitten.

---

## A — Vertrauen: Fehler und Eindruck (zuerst)

### A1 Training geht nicht mehr verloren  ·  ~1 Tag  ·  keine Migration
Laufendes Training (Athlet **und** Trainer-Tracking) bei jeder Eingabe
in `localStorage` sichern: Slots, Sätze, Plantag, Startzeit, Pausen.
Schlüssel je Nutzer + Klient, damit zwei Konten auf einem Gerät sich
nicht mischen. Beim Öffnen von „Training starten" / Tracken, wenn ein
Entwurf da ist:

> **Unfinished workout from 18:42** — Day A, 3 exercises, 9 sets
> [Continue] [Discard]

Auch auf „Heute" ein Hinweis-Banner, solange ein Entwurf liegt. Nach
erfolgreichem Speichern (Rücklesen, Regel 3) Entwurf löschen. Entwürfe
älter als 24 h verfallen. Lesen nur in `useEffect` (sonst
Hydration-Fehler, Regel 8/PROJEKTSTAND Abschnitt 3); jeder Zugriff in
try/catch (privater Modus). Gemeinsame Logik in einer neuen reinen
Datei `app/training-entwurf.ts` mit Tests im App-Testlauf.

### A2 Supersätze bleiben beim Verschieben zusammen  ·  ½ Tag
Slots mit gleichem Supersatz-Buchstaben werden als **ein Block**
verschoben (A1+A2 rutschen gemeinsam an B vorbei). Umsetzung als
SQL-Funktion `move_slot_block(slot, richtung)` in **Migration 0030**,
die die Positionen eines Tages in einer Transaktion neu vergibt und
nachzählt — statt zweier unabhängiger `update`s ohne Rücklesen wie
heute. `moveSlotAction` ruft nur noch diese Funktion.

### A3 Passwort-Mail im Spam  ·  Einrichtung, kein Code
Eigene Domain + Versand über Resend mit SPF/DKIM/DMARC — Anleitung
steht schon in `RESEND-EINRICHTEN.md`. Danach Site URL und Absender in
Supabase umstellen. **Braucht von euch:** Domain kaufen/wählen.

### A4 „Sieht nach KI aus" — Textpass  ·  ½ Tag
- Lange Gedankenstriche „—" in allen sichtbaren Texten
  (`app/i18n/de|en`) durch Punkt, Komma oder Doppelpunkt ersetzen;
  kürzere, direktere Sätze.
- „·" als Trenner in der Übungsauswahl und Listen durch klarere
  Darstellung ersetzen (zweite Zeile, Chips oder Komma).
- Neue Prüfregel in `check-texte.mjs`: kein „—" in Wörterbuchtexten,
  damit es nicht zurückkommt (mit Selbstprüfung, Regel 4).
- „Rote Bar über einem Textfeld": **erst Screenshot von Joël**, dann
  gezielt ändern.

### A5 Geburtsdatum am Laptop  ·  ½ Stunde
Der native Datumswähler bleibt am Rechner offen. Ersetzen durch drei
schlichte Auswahlfelder Tag / Monat / Jahr (Monatsnamen aus `t.fmt`),
oder ein Textfeld mit Format TT.MM.JJJJ. Betrifft „Add client",
Stammdaten in der Akte, Profil des Athleten.

---

## B — Trainer-Alltag: weniger Klicks

### B1 Nach „Add client": Nächste Schritte statt Pflicht-Dialog  ·  ½ Tag
Statt automatisch den Plan-Dialog: eine Karte oben in der Akte

> **Client created. What's next?**
> [Set up check-in] [Create training plan] [Later]

„Later" blendet die Karte aus. Platz für einen vierten Knopf „Goal
setting" später. Betrifft `coach/clients/[id]/page.tsx`, `plan.tsx`
(`startWithPlan` fällt weg), `checkin-config.tsx` (von außen öffnen).

### B2 Planname direkt beim Zuweisen  ·  1 Stunde
Im Zuweisen-Dialog (`training/programs/[id]/assign-dialog.tsx`) ein
Namensfeld, vorbelegt mit **„Vorname + Programmname"** (z. B. „Aaron
Full Body 2×"), aktualisiert sich beim Klientenwechsel. Die Funktion
`assign_template` nimmt den Namen schon an (`p_name`, 0028) — nur die
Oberfläche fehlt.

### B3 Plan eines Klienten als Programm speichern  ·  ½ Tag
Im Plan-Editor ein Knopf „Save as program". SQL-Funktion
`plan_to_template(plan, name)` in **0031**, gleiche Bauart wie
`copy_template` (0028) inkl. Nachzählen.

### B4 Startwerte je Block  ·  10 Minuten
`BLOCK_DEFAULTS` in `coach/plans/[id]/slot-form.tsx`:
Compound **3×6–8**, Isolation **3×10–15**, Funktional **3×15–20**
(Rumpf bleibt 3×12–20).

### B5 Startgewicht im Plan  ·  1 Tag
Neue Spalte `plan_slots.target_weight_kg` (**0031**, mit Zeilen in
`check_schema.sql`). Feld „Start weight (kg)" im Slot-Formular. Beim
Athleten und beim Tracken wird es als Vorschlag ins kg-Feld der ersten
Sätze gesetzt (überschreibbar). Kopierfunktionen in 0028/0031 nehmen
die Spalte mit.

### B6 Feed: Kacheln klickbar  ·  1 Stunde
`StatCard` (`app/components.tsx`) bekommt optional `href`:
Active clients → Klientenliste · Urgent → springt zu den Hinweisen im
Feed (und bekommt einen erklärenden Untertitel „Plateaus and missed
sessions") · Appointments → Kalender · Open check-ins → Check-ins.

### B7 Notizen beim Tracken  ·  1 Tag
Kurznotiz **je Klient und Übung** („Handgelenk ab 120 kg"), die beim
nächsten Mal genau bei dieser Übung oben steht — beim Trainer-Tracking
und im Plan-Editor. Neue Tabelle `client_exercise_notes` (**0031**) mit
RLS: nur der Trainer des Klienten liest/schreibt. Athlet sieht sie
vorerst nicht (Trainer-Notiz).

---

## C — Inhalte und Daten

### C1 Übungsbibliothek: Varianten und Kategorien  ·  1–2 Tage + Inhalt von Joël
- **Varianten**: z. B. Row → Barbell Row, Chest-Supported Row, Inverted
  Row, Cable Row … als eigene Übungen. **Joël liefert die Liste**
  (Name, Muskelgruppe, Block, Körpergewicht ja/nein).
- **Kategorie unabhängig von der Muskelgruppe**: neues Feld
  `exercises.categories` (z. B. Full Body, Conditioning, Mobility) als
  zusätzlicher Filter in der Übungsauswahl — Mountain Climbers stehen
  dann unter „Conditioning", nicht nur unter Chest.
- **Übungsnamen überall Englisch**: `localizeExercise`
  (`packages/db/src/queries.ts`) nimmt für globale Übungen immer
  `name_en`; Aufbau/Hinweis bleiben je Sprache.
- Migration **0032** (Inhalt), Prüfblock wie in 0026.

### C2 PAR-Q in der Klienten-App  ·  1–2 Tage  ·  ⚠️ Recht
Beim ersten Öffnen der App (und erreichbar im Profil): die 7 PAR-Q-
Fragen ja/nein + Freitext bei „ja". Trainer sieht Ergebnis in der Akte
(Reiter Details), auffällige Antworten markiert. Tabelle
`par_q_responses` (**0032**), RLS: Klient schreibt eigene, Trainer
liest. **Gesundheitsdaten nach Art. 9 DSGVO** → braucht Einwilligung und
Datenschutzerklärung wie die Fotos; Fragentext auf Nutzungsrechte
prüfen (PAR-Q ist urheberrechtlich geschützt, Nutzung meist frei mit
Quellenangabe). Bis dahin nur mit Testpersonen.

### C3 Datenexport für Trainer  ·  1 Tag
Im Profil „Export my data": Download als CSV-Dateien (Klienten,
Einheiten mit Sätzen, Check-ins, Pläne). Läuft über die Sitzung des
Trainers, also nur eigene Daten (RLS). Eine Route
`app/coach/export/route.ts`, Datumsformate über `t.fmt`.

---

## D — Geparkt (bewusst nicht jetzt)

- Metcon/EMOM/Hyrox: andere Einheiten als kg/Wdh. (Bahnen, Höhe,
  Zeit). Konzept später, damit es nicht ausufert.
- Goal setting beim Anlegen (Platz in B1 ist vorgesehen).
- Ketten-Themen: Lead-Marktplatz, Retention-Alerts mit Paketen,
  Case-Study-Einreichung, Trainmore-Templates, Trainer-Fragebogen,
  Bulk-Import.

---

## Reihenfolge

1. **A1** Autosave, **A2** Supersätze, **B4** Startwerte, **A5**
   Geburtsdatum — sofort, das ist der Datenverlust und die Ärgernisse.
2. **B1, B2, B6** — schnelle Klick-Ersparnis.
3. **A4** Textpass (nach Screenshot), **B3, B5, B7** mit Migration 0031.
4. **C1** sobald Joëls Übungsliste da ist, **C3** Export.
5. **C2** PAR-Q erst, wenn Datenschutzerklärung steht.
6. **A3** parallel, sobald die Domain da ist.

Migrationen: **0030** (move_slot_block, mit Schritt 1 eingespielt),
**0031** (plan_to_template, target_weight_kg, client_exercise_notes),
**0032** (Übungen/Kategorien,
PAR-Q) — je mit Prüfblock und Zeilen in `check_schema.sql`, Befehle
als Dateien in `supabase/befehle/`.

**Von euch gebraucht:** Screenshot zur roten Bar · Joëls Liste der
Übungsvarianten und Kategorien · Domain für den Mailversand.

---

## Prüfung

- `bash pruefen.sh` (zehn Prüfungen) vor jedem Commit; neue reine Logik
  (Entwurf speichern/verwerfen, Slot-Block-Verschiebung) mit Tests im
  App-Testlauf; neue Textregel in `check-texte.mjs` einmal mit
  absichtlich eingebautem „—" gegenprüfen.
- Im Browser lokal, Handy- und Rechnerbreite, beide Sprachen:
  Training starten → Sätze eintragen → Tab schließen → neu öffnen →
  „Continue" stellt alles wieder her; Supersatz A1/A2 verschieben;
  Add client → Nächste-Schritte-Karte; Programm zuweisen mit Namen;
  Feed-Kacheln führen an die richtigen Stellen.
- Nach jeder Migration `check_schema.sql` im SQL-Editor: keine Zeile
  mit `>>> FEHLT <<<`.
- `pnpm build` (Dev-Server vorher anhalten).
