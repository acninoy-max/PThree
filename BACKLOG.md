# Backlog

Stand: 23. September 2026. Was gebaut ist, steht nicht hier — das steht im Code.

Gegen den Code geprüft. Ein Backlog, der Erledigtes als offen führt, kostet
mehr Zeit als er spart: Man plant zweimal dieselbe Sache.

---

## 1. Aus den Meetings — erledigt

Merkposten, was dabei entschieden wurde.

**Fortschritt pro Übung** läuft beidseitig, jeder mit eigener Auswahl
(Migration 0016/0018). Die Musterkurven sind aus der Oberfläche verschwunden;
die Engine rechnet intern weiter damit, weil die Coach-Hinweise darauf
aufbauen.

**Trainer trackt für den Klienten** liegt unter *Tracken*. Dabei hat sich
eine frühere Notiz hier als falsch erwiesen: Ich hatte behauptet, die
Zeilensicherheit verbiete dem Coach das Schreiben im Namen eines Klienten.
`sessions_coach_all` aus Migration 0002 erlaubt es seit jeher. Gefehlt hat
nur `recorded_by` — wer eingetragen hat. Das ist vier Zeilen Migration statt
einer Schema-Entscheidung.

Aus `recorded_by` entsteht später die Betreuungsquote fürs Ketten-Dashboard.

### Meeting 16.09

Alle Oberflächenpunkte gebaut. Drei davon waren mehr als Kosmetik:

**Die Navigation zeigte auf dem Handy nie, wo man ist.** Nicht „zu
dezent", sondern gar nicht: Der halbe Regelblock — Pille hinter dem
Symbol, aktiver Zustand, Platz für die Tab-Leiste, kleinere
Überschriften — stand irrtümlich in `@media (max-width: 360px)`. Auf
einem iPhone (375–430px breit) griff davon nichts. Dieselbe Ursache ließ
auch den letzten Inhalt unter der Leiste verschwinden. Jetzt liegt alles
im 640px-Block; der aktive Punkt trägt einen Balken, eine getönte Pille
und dunklere Schrift. In der Kopfzeile am Laptop war „aktiv" bis eben
dasselbe Grau wie „Zeiger darüber" — auch das war also keine Anzeige.

**Die Veränderung in den Kurven** steht jetzt klein am Ende der Linie und
am Chip darunter. Sie bezieht sich auf den gewählten Zeitraum, nicht auf
die ganze Historie — sonst hieße „−15 kg" nach einem Tipp auf „1 Monat"
etwas anderes als das Bild darüber. Ohne Grün und Rot: −15 kg auf der
Waage ist ein Erfolg, −15 kg beim Bankdrücken das Gegenteil.

**Das Zahnrad in der Klientenakte** (Migration 0019) lässt den Trainer
Abschnitte an- und abwählen und ihre Reihenfolge festlegen. Pro Trainer,
nicht pro Klient — wer die Akte anders liest, liest sie bei jedem anders.
Plan, Termine und Verwaltung bleiben fest: Das ist die Steuerung und
nicht der Inhalt, und einen Plan zuweisen zu können darf nicht davon
abhängen, was jemand vor drei Wochen eingestellt hat.

Nebenher entstanden zwei Testläufer, die ohne Paketinstallation
auskommen: `packages/coach-engine/run-tests.sh` und
`apps/coach/run-tests.sh`. Der zweite hätte fast still durchgelaufen —
`node --test` deutet Pfadargumente als Suchmuster, und der Ordner heißt
`[id]`. Die Zeichenklasse fand nichts, der Lauf meldete „0 Tests
bestanden". Läuft jetzt Datei für Datei.

### Nachtrag 23.09 — zwei Fehler, die ich selbst eingebaut habe

Aarons Screenshot zeigte eine zerlegte Kopfzeile und einen Feed, der auf
dem Handy zweispaltig blieb.

**Die Kopfzeile war eine Folge des 16.09-Fixes.** `.pt-header__inner`
trägt auch `.pt-shell`, und dort steht der untere Innenabstand, der Platz
für die Tab-Leiste macht. Solange diese Regel fälschlich im
360px-Block stand, kam sie nie an. Sobald sie richtig im 640px-Block
stand, fraß sie mit `box-sizing: border-box` die 60px Höhe der Kopfzeile
auf. Behoben mit `.pt-header .pt-header__inner` — zwei Klassen im
Selektor, damit die Regel unabhängig von der Reihenfolge gewinnt.

Lehre: Eine Layoutklasse, die zwei verschiedene Dinge kleidet (Inhalt
und Kopfzeile), ist eine Falle. Wer das nächste Mal etwas an `.pt-shell`
ändert, ändert auch die Kopfzeile mit.

**Der Feed war der dritte Inline-Style-Fehler in Folge.** Erst die
Kopfnavigation mit `display: flex`, dann der Feed und vier weitere
Stellen mit festgeschriebenen Spaltenrastern. Immer dieselbe Ursache:
Ein `style`-Attribut steht über jeder Regel aus dem Stylesheet, auch
über der aus `@media`. Am Laptop sieht man es nie.

Daraus entstand `apps/coach/check-layout.mjs`. Er liest die Stylesheets
und merkt sich, welche Klasse welche Eigenschaft in einer Media-Query
setzt — und meldet dann jeden Inline-Style, der genau diese Eigenschaft
auf genau dieser Klasse überschreibt. Keine Faustregel, also keine
Fehlalarme: Das harmlose `<label className="pt-label" style={{ display:
"grid" }}>` bleibt unbeanstandet. Die erste, grobe Fassung meldete 61
Stellen und wäre damit unbrauchbar gewesen.

Der Prüfer hat eine Selbstprüfung: Findet sein Parser die beiden Regeln
nicht mehr, die die echten Fehler verursacht haben, bricht er mit einer
Fehlermeldung ab, statt fälschlich Entwarnung zu geben.

Neu in `globals.css`, statt der Inline-Styles: `.pt-cols` und
`.pt-cols--3` für Feldpaare und -tripel, `.pt-card--stat` und
`.pt-card--empty` für abweichende Innenabstände.

**Und die Tabelle aus 0019 riss die ganze Akte mit.** `fetchViewSections`
warf, solange die Migration nicht eingespielt war — kein Plan, keine
Check-ins, keine Einheiten, nur eine rote Fehlerseite. Wegen der
Reihenfolge von Kacheln. Beim Ausrollen liegen Code und Schema immer ein
paar Minuten auseinander; das wäre also auch auf Vercel passiert, nur
dann bei Joel. Jetzt fällt die Abfrage bei fehlender Tabelle auf die
Standardanordnung zurück und schreibt eine Warnung ins Serverprotokoll.
Alle anderen Fehler fliegen weiter.

Regel daraus: **Eine Abfrage, die nur eine Anzeigevorliebe holt, darf
keine Seite mitreissen.** Beim nächsten optionalen Feature gleich so
bauen.

### Nachtrag 23.09, zweiter Teil — das Zahnrad war eine Sonne

Aaron hat den Knopf im Studio nicht als Knopf erkannt. Meine erste
Fassung zeichnete einen Kreis mit acht Strichen nach aussen — das ist
keine schlechte Zahnradzeichnung, das ist eine Sonne. Neu: eine
geschlossene Kontur mit acht Zähnen zu je 22,5° und Lücken derselben
Breite.

Wichtiger als das Symbol ist aber der Text daneben. Aus dem reinen
Icon-Knopf wurde **Zahnrad + „Ansicht"**. Ein Knopf, den niemand findet,
ist kein Knopf — und die 70px, die das Wort kostet, sind billiger als
ein Feature, das keiner benutzt.

Gilt auch für die Zukunft: In der Coach-App darf ein Symbol ohne Text
nur dort stehen, wo die Bedeutung aus der Umgebung folgt (Kreuz zum
Schliessen, Pfeile zum Verschieben). Alles, was eine eigene Funktion
öffnet, bekommt eine Beschriftung.

---

## 2. Vor einer echten Beta

### Anleitungen zu den Körpermaßen

Taille am Bauchnabel oder an der schmalsten Stelle unterscheidet sich um 3–5 cm.
Misst der Athlet jede Woche anders, ist der „Fortschritt" Rauschen — und die
Kurve lügt in beide Richtungen.

Ein Satz pro Maß direkt im Formular. Wenig Arbeit, aber es entscheidet
darüber, ob die Zahlen überhaupt etwas wert sind.

### Ziele mit Zielwerten

Beispiele aus dem Meeting: „100 kg Bankdrücken", „15 kg Fett verlieren".
Entschieden: Der Athlet schlägt vor, der Coach bestätigt. Es gibt dafür noch
keine Tabelle.

Zwei Dinge bestimmen die Umsetzung:

1. „100 kg Bankdrücken" ist übungsbezogen, die Auswertung folgt dem Muster.
   Kein Widerspruch — die Daten liegen vor —, aber Ziel und Verlauf sind zwei
   Brillen und dürfen in der Oberfläche nicht vermischt werden.
2. Gewichtsziele gehen heute. **Fettziele hängen an InBody** und damit an
   einem geparkten Punkt.

### Fortschrittsfotos — GEBAUT am 23.09

Steht: Einwilligung, Upload mit Verkleinern im Browser, Galerie,
Vorher-Nachher mit Spanne und Gewichtsdifferenz, Sicht für den Trainer,
Widerruf der wirklich löscht. Migration 0020.

Was dabei entschieden wurde und nicht mehr zur Debatte steht, solange
niemand einen Grund nennt:

- **Nur der Athlet lädt hoch, der Trainer sieht nur.** Ein Trainer, der
  Körperfotos seines Klienten selbst ins System legt, ist eine andere
  Rechtslage. Wenn Joel das im Studio braucht, bauen wir es bewusst
  dazu — mit eigener Einwilligung dafür.
- **Die Einwilligung steht in der Zeilensicherheit, nicht in der App.**
  `has_photo_consent()` hängt in der Schreibregel. Die Oberfläche fragt
  zwar auch, aber sie ist die schwächere Stelle.
- **Der voreingestellte Vergleich ist ältestes gegen neuestes.** Nicht
  die letzten beiden: Zwei Aufnahmen im Abstand einer Woche
  unterscheiden sich nicht sichtbar, und ein Vergleich, in dem man
  nichts sieht, entmutigt.
- **EXIF wird beim Verkleinern entfernt**, samt GPS. Nebenwirkung des
  Umwegs über die Leinwand — aber die wichtigste. Ein Körperfoto von zu
  Hause trägt sonst die Koordinaten der Wohnung mit.

Offen dazu: die **Löschfrist**, wenn die Betreuung endet, und der
**anwaltlich geprüfte Einwilligungstext**. Siehe `STAND.md`, Punkt 4.

### Was daraus für den nächsten optionalen Block gilt

Zwei Sachen, die beim Fotoblock Zeit gekostet haben und beim nächsten
Mal von vorn herein so gebaut gehören:

**Eine optionale Abfrage darf keine Seite mitreissen.** Dieselbe Regel
wie bei der Tabelle aus 0019: Fehlt die Tabelle noch, gibt
`fetchProgressPhotos` eine leere Liste zurück statt zu werfen. Beim
Ausrollen liegen Code und Schema immer ein paar Minuten auseinander.

**`tsc` kennt die Regeln von Next.js nicht.** Aus einer
`"use server"`-Datei darf nur herauskommen, was eine asynchrone Funktion
ist. Ein `export const` dort rutscht durch jede Typprüfung und bricht
erst bei `next build`. Genau das ist hier passiert — deshalb gibt es
jetzt `apps/coach/check-actions.mjs`.

---

## 3. Vor dem Verkauf

### Ketten-QA-Dashboard

**Das ist die Verkaufsgeschichte Richtung Trainmore — und es existiert nicht.**

Aggregierte Kennzahlen über die Trainer einer Einrichtung: Wie viele Klienten
haben einen aktiven Plan, wie viele Einheiten wurden erfasst, wie viele
Check-ins beantwortet, wo reißt die Betreuung ab.

Das Fundament steht, weil jede Einheit, jeder Check-in und jede Antwort mit
Zeitstempel in der Datenbank liegt — insbesondere `coach_replied_at`, das der
Server setzt und der Coach nicht fälschen kann. Was fehlt, ist die Rolle
`org_admin` mit eigenen RLS-Regeln und die Auswertung darüber.

### Zahlungen über Mollie Connect

Der ARPU-Hebel von rund 30 € auf rund 100 €. Noch keine Zeile Code.

### Chat und Nudges

Heute läuft die Kommunikation über Check-in und Coach-Antwort. Das reicht für
die Beta, aber nicht dauerhaft.

---

## 4. Geparkt — externe Schnittstellen

### Apple Health

**Geht nicht mit einer Web-App.** HealthKit hat keine Web-Schnittstelle; der
Zugriff braucht eine native App mit Apple-Entitlement. Die Athleten-Seite ist
bewusst mobiles Web — null Installationshürde für die Beta.

Konsequenz: Dieser Punkt holt eine native App zurück auf die Landkarte.
Android bräuchte separat Health Connect. Strategische Entscheidung, keine
technische Kleinigkeit.

Nebenbei löst eine native App auch die Grenze des Pausen-Timers: iOS friert
JavaScript bei gesperrtem Bildschirm ein, der Ton käme dann verspätet.

### MyFitnessPal

Weg über Apple Health, also abhängig vom Punkt oben. Der Zwei-Wege-Sync
scheint an MyFitnessPal Premium zu hängen (rund 80 $/Jahr) — **mit einem
echten Konto prüfen**, bevor wir darauf planen. Eine offene öffentliche API
gibt es nicht.

### InBody

Es gibt eine echte Schnittstelle: **LookinBody Web API**, kostenpflichtiges
Abo, mit EU-Endpunkt. Ablauf: Antrag stellen, API-Key erzeugen, Server-IP und
Webhook hinterlegen.

Wichtig für den Vertrieb: Das Abo hängt an der Einrichtung, nicht am Trainer.
Damit ist InBody ein **Trainmore-Thema, kein Freelancer-Thema** — und passt in
die Ketten-Argumentation neben dem QA-Dashboard.

---

## 5. Kleinkram

- Tertiäre Muskelgruppen wären der nächste Schritt nach den Nebengruppen aus
  0014 — vermutlich unnötig. Erst fragen, ob jemand sie vermisst.
- Paketnamen und Ordner heißen weiter `ptfive`, nach außen ist alles PTHREE.
  Reine Innenverkabelung, fasst aber jeden Import an.
- Vorlagensystem für Pläne: Beim Anlegen gibt es sieben Aufteilungen zur
  Auswahl. Wiederverwendbare eigene Vorlagen des Trainers fehlen — die Tabelle
  `templates` liegt seit 0001 ungenutzt im Schema.
- `npx next build` läuft in der Sandbox nicht (node_modules für macOS gebaut).
  Muss vor jedem Ausrollen einmal auf einem echten Rechner durchlaufen.
  **`npx tsc -p apps/coach/tsconfig.json --noEmit` läuft dagegen überall**
  und ist der breiteste Prüfer, den wir haben — vor jeder Änderungsrunde
  einmal durchlassen.
- Sechs Prüfer laufen vor jedem Testlauf: `supabase/check_sql.py`,
  `apps/coach/check-format.mjs`, `apps/coach/check-layout.mjs`,
  `apps/coach/check-actions.mjs`, `packages/coach-engine/run-tests.sh`
  und `apps/coach/run-tests.sh`. Die ersten vier sind aus echten
  Fehlern entstanden und kennen nur die Klassen, die uns schon
  getroffen haben.
- **Neue Layoutregeln gehören in `globals.css`, nicht ins `style`-
  Attribut.** Vorhanden: `.pt-split` (zwei Spalten, bricht bei 900px),
  `.pt-cols` / `.pt-cols--3` (Feldgruppen), `.pt-card--stat`,
  `.pt-card--empty`.
- Noch ohne Tests in `apps/coach/run-tests.sh`: `plan-week.ts` (die
  Datumsrechnung, an der der 09.09.-Fehler hing) und `format.ts`. Beide
  sind bereits in der Konfiguration eingetragen, es fehlen nur die
  Testdateien — der nächste, der dort etwas anfasst, sollte welche
  mitbringen.
- `ExerciseValuePoint` in der Engine ist die schmale Fassung von
  `ExercisePoint` für alles, was über die Server-Grenze geht. Wer dort
  ein Feld ergänzt, muss beide Stellen ansehen.
