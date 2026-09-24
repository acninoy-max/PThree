# Testlauf

Durchgang durch alles, was seit dem Plan-Builder dazugekommen ist.
Abschnitte 0 bis 6 sind der Grundlauf (etwa 15 Minuten), 7 bis 11 decken
Pausen-Timer, Körpergewicht als Last, Fortschritt pro Übung und das
Tracking durch den Trainer ab. Abschnitt 13 ist neu und bringt zusammen,
was aus dem Meeting 16.09 gebaut wurde. Zusammen etwa 40 Minuten.

Dieselbe Liste taugt später für Joels Beta-Tester.

**Was du brauchst:** Mac mit laufendem Server (`npm run dev` im Ordner
`ptfive`) und das Handy im selben Netz. Die Adresse fürs Handy steht in
`apps/coach/.env.local` — aktuell `http://172.20.10.2:3000`. Bei
Netzwerkwechsel neu setzen: `ipconfig getifaddr en0` am Mac.

---

## 0 · Schema prüfen

Zwei Schritte, der erste am Mac:

```bash
npx tsc -p apps/coach/tsconfig.json --noEmit   # der breiteste Prüfer
python3 supabase/check_sql.py
node apps/coach/check-format.mjs
node apps/coach/check-layout.mjs
node apps/coach/check-actions.mjs
node apps/coach/check-scale.mjs
bash packages/coach-engine/run-tests.sh
bash apps/coach/run-tests.sh
```

`tsc` geht über alle App-Dateien und meldet jeden Tippfehler, jede
falsche Signatur, jedes vergessene Feld. Er braucht weder Server noch
Datenbank und ist damit der günstigste Fehlerfund, den wir haben.

`check_sql.py` prüft alle SQL-Dateien auf Syntax und auf die
Fehlerklassen, die uns schon getroffen haben. `check-format.mjs` meldet
gebietsabhängige Datumsformate — die brechen nur auf dem Handy, weil
Server und iPhone verschiedene ICU-Fassungen benutzen.

`check-layout.mjs` ist der neueste und stammt aus zwei echten Fehlern:
Ein `style`-Attribut schlägt jede Regel aus dem Stylesheet, auch die aus
`@media`. So blieb erst die Kopfnavigation auf dem Handy stehen und
später der Coach-Feed zweispaltig, mit einer 120px breiten linken
Spalte. Der Prüfer liest die Stylesheets und meldet jeden Inline-Style,
der eine Media-Query aushebelt.

`check-actions.mjs` fängt zwei Regeln, die TypeScript nicht kennt. Aus
einer `"use server"`-Datei darf nur herauskommen, was eine asynchrone
Funktion ist — eine Konstante dort bricht erst bei `next build`. Und
eine Server-Komponente darf einer Client-Komponente keine **Funktion**
als Prop mitgeben; das bricht sogar erst, wenn jemand die Seite öffnet.
Beides ist typseitig völlig korrekt und trotzdem falsch.

`check-scale.mjs` hält das Schriftraster: Alle Größen stehen als Token
in `globals.css`, und jede freie Zahl im Markup wird gemeldet.

**Alle vier finden Dinge, die `tsc` nicht sieht.** Genau dafür sind sie
da.

Erwartung: kein `tsc`-Ausdruck, *21 Dateien geprueft, keine
Beanstandung*, zweimal *83 Dateien geprueft*, fünf saubere
`"use server"`-Dateien, **83 Engine-Tests** und **27 App-Tests**, alle
bestanden.

Dann `supabase/check_schema.sql` im Supabase-SQL-Editor ausführen.
Erwartung: **keine Zeile mit „>>> FEHLT <<<“**. Unten stehen die
tatsächlichen Zahlen als INFO-Zeilen — dort siehst du unter anderem, wie
viele Sätze schon einen Körperanteil tragen und wie viele Einheiten vom
Trainer erfasst wurden.

---

## 1 · Coach: Plan bauen

Am Mac, eingeloggt als Coach.

| # | Schritt | Erwartung |
|---|---|---|
| 1.1 | Klient öffnen → rechts „Trainingsplan" → **Plan anlegen** | Dialog mit sieben Vorlagen |
| 1.2 | **Push / Pull / Beine** wählen | Tagesliste füllt sich mit drei Zeilen |
| 1.3 | Einen Tag umbenennen, einen vierten hinzufügen, ihn wieder löschen | Liste folgt sofort |
| 1.4 | **Anlegen und Slots füllen** | Landet im Editor |
| 1.5 | Bei Tag A auf **Mit Trainer** tippen | Schalter wird rot |
| 1.6 | **+ Slot**: Muster „Oberkörper drücken", Block „Grundübung" | Sätze springen auf 4 × 5–8 |
| 1.7 | Übung „Bankdrücken (Langhantel)", Supersatz **A**, Tempo `3111`, Pause `90` | — |
| 1.8 | Hinzufügen | Slot-Zeile zeigt `A1` links, „Tempo 3111 · Pause 1:30 min" |
| 1.9 | Zweiter Slot, Muster „Oberkörper ziehen", ebenfalls Supersatz **A** | Zeile zeigt `A2` |
| 1.10 | Dritter Slot ohne Supersatz | Zeile **ohne** Code — das ist Absicht |
| 1.11 | Vierter Slot: Muster **Rumpf** | Block springt auf „Rumpf", Hinweistext erscheint |
| 1.12 | Slot mit den Pfeilen nach oben schieben | Reihenfolge ändert sich, Codes werden neu vergeben |

**Absichtlich schiefgehen lassen:**

| # | Eingabe | Erwartete Meldung |
|---|---|---|
| 1.13 | Tempo `31` | „Tempo braucht vier Zeichen, z. B. 3111 oder 30X0." |
| 1.14 | Pause `2000` | „Die Pause muss zwischen 0 und 15 Minuten liegen." |
| 1.15 | Wdh. von 12, bis 8 | „Die untere Wiederholungszahl darf nicht über der oberen liegen." |

---

## 2 · Coach: eigene Übung

| # | Schritt | Erwartung |
|---|---|---|
| 2.1 | Im Slot-Formular **Übung fehlt? Eigene anlegen** | Feld klappt auf, zeigt „wird als … gespeichert" |
| 2.2 | Name eingeben, anlegen | Steht sofort im Auswahlmenü mit „(eigene)" |
| 2.3 | Denselben Namen nochmal anlegen | „Eine eigene Übung mit dem Namen gibt es schon." |
| 2.4 | Menüpunkt **Übungen** öffnen | 77 plus deine eigenen; die Filterleiste zeigt Muskelgruppen, nicht Bewegungsmuster |
| 2.5 | Nach „Curl" suchen, Filter „Rumpf" | Liste reagiert sofort |
| 2.6 | Eine globale Übung ansehen | **Kein** Löschknopf — nur eigene sind löschbar |
| 2.7 | Bei „Bankdrücken (Langhantel)" nachsehen | Aufbau-Zeile: „Langhantel · Flachbank · Obergriff …" |

---

## 3 · Athlet: Einheit ausführen

Auf dem **Handy**, eingeloggt als Athlet. Das ist der Teil, der zählt.

| # | Schritt | Erwartung |
|---|---|---|
| 3.1 | Startseite | Karte „Training" nennt den nächsten Plantag |
| 3.2 | **Training starten** | Tagesauswahl, ein Tag mit **DRAN** markiert |
| 3.3 | Angaben je Tag prüfen | „Mit Trainer / Allein · n Übungen · ca. x Min" |
| 3.4 | Tag antippen | Startdialog mit Dauer und „Die Uhr läuft ab jetzt mit" |
| 3.5 | **Los geht's** | Uhr oben rechts zählt hoch |
| 3.6 | Pausenknopf | Uhr steht, Zahl wird grau; nochmal → läuft weiter |
| 3.7 | Erste Übung ansehen | `A1` links, Name, Aufbau-Zeile grau, Vorgaben unter der Tabelle |
| 3.8 | Auf ein kg-Feld tippen | **Ziffernblock fährt hoch**, iOS-Tastatur bleibt weg |
| 3.9 | `60` eingeben, **Weiter** | Springt auf Wdh., dann RIR, dann Satz 2 |
| 3.10 | Durchtippen bis zum Ende | Letzter Knopf heißt **Fertig** |
| 3.11 | Bei kg ein Komma tippen | Geht; bei Wdh. und RIR ist die Taste ausgegraut |
| 3.12 | Bei RIR `11` versuchen | Nimmt nur bis 10 an |
| 3.13 | Summenzeile unten | Satzzahl und Gesamtgewicht laufen mit |

### Der wichtige Sonderfall: Übung tauschen

| # | Schritt | Erwartung |
|---|---|---|
| 3.14 | Bei einer Plan-Übung auf **tauschen** | Auswahl **im selben Muster**, Hinweis „dein Verlauf läuft weiter" |
| 3.15 | Andere Übung wählen | Slot behält `A1`, Vorgaben und Sätze |

### Der zweite Sonderfall: unvollständig

| # | Schritt | Erwartung |
|---|---|---|
| 3.16 | Mehrere Sätze leer lassen, **Training abschließen** | Dialog: „Noch nicht alles ausgefüllt", „x von y geplanten Sätzen" |
| 3.17 | **Zurück zum Training** | Nichts gespeichert, Uhr läuft weiter |
| 3.18 | Alles ausfüllen, abschließen | Dialog: „Alles drin", Satzzahl und Dauer |
| 3.19 | Speichern | Landet auf der Startseite |

---

## 4 · Zurück zum Coach

| # | Schritt | Erwartung |
|---|---|---|
| 4.1 | Klientenakte öffnen | Einheit steht unter „Letzte Einheiten" |
| 4.2 | Getauschte Übung ansehen | Steht mit **neuem** Namen, aber im ursprünglichen Muster |
| 4.3 | „Fortschritt pro Bewegungsmuster" | Kurve für das Muster ist **nicht** abgerissen |
| 4.4 | Rumpfübung suchen | Taucht in **keiner** Musterkarte auf |

---

## 5 · Check-in-Loop

| # | Schritt | Erwartung |
|---|---|---|
| 5.1 | Handy → **Check-in** ausfüllen und abschicken | Grünes Erfolgs-Modal |
| 5.2 | Mac → **Check-ins** | Steht unter „Offen", mit Werten und Notiz |
| 5.3 | Antworten | Wandert nach „Beantwortet" |
| 5.4 | Handy neu laden | Antwort steht auf der Startseite und im Check-in |
| 5.5 | Werte korrigieren, speichern | Modal sagt „Änderung gespeichert" |

---

## 6 · Kalender

| # | Schritt | Erwartung |
|---|---|---|
| 6.1 | Kalender → **Monat** | Sechs-Wochen-Raster, heute markiert |
| 6.2 | Auf einen leeren Tag klicken | Termin-Formular mit dem Datum vorbelegt |
| 6.3 | Auf einen Termin im Raster klicken | Führt zum Klienten, legt **keinen** Termin an |
| 6.4 | Blättern, dann **Heute** | Springt zurück |
| 6.5 | Handy → Terminkarte antippen | Kein Unterstrich beim Tippen, führt zur Übersicht |

---

## 7 · Pausen-Timer und Satz löschen

Am **Handy**, als Athlet, Training nach Plan gestartet.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 7.1 | Bei einer Übung mit Pausenvorgabe alle drei Felder des ersten Satzes füllen | Nach dem letzten Feld springt unten die Pausenleiste hoch, Countdown läuft |
| 7.2 | Warten, bis sie bei 0:00 ankommt | Drei aufsteigende Töne, Handy vibriert, Leiste wird grün, verschwindet nach ein paar Sekunden |
| 7.3 | Neue Pause starten, `+15` und `−15` antippen | Restzeit springt entsprechend, Balken bleibt im Rahmen |
| 7.4 | `Skip` antippen | Leiste ist sofort weg |
| 7.5 | Handy sperren, 2 Minuten warten, entsperren | **Die Uhr oben stimmt weiter.** Sie rechnet aus Zeitstempeln, nicht aus Ticks |
| 7.6 | Bei einer Übung auf das ✕ rechts neben einem Satz tippen | Satz verschwindet, die übrigen werden neu nummeriert |
| 7.7 | Solange löschen, bis ein Satz übrig ist | Das ✕ ist ausgegraut — der letzte Satz bleibt, dafür gibt es das Entfernen der Übung |
| 7.8 | Einen Satz *hinzufügen* | Unter der Übung steht „4 statt 3 Sätzen — nur für heute" |

**Ton kommt nicht?** Einmal auf „Training starten" getippt zu haben ist
Voraussetzung — der Browser öffnet den Audiokanal nur aus einer
Nutzergeste. Ohne diesen Tipp bleibt es still, die Vibration kommt
trotzdem.

---

## 8 · Körpergewicht als Last

Setzt voraus, dass du als Athlet **im Check-in ein Gewicht gemeldet**
hast. Sonst zeigt die App genau das an, und die Übung bleibt auf der
Wiederholungsskala — auch das ist ein gültiges Testergebnis.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 8.1 | Klimmzüge in ein Training aufnehmen | Über der Satztabelle: „Zählt mit **X** kg Körpergewicht. Ins kg-Feld nur, was du zusätzlich dranhängst." |
| 8.2 | Spaltenkopf ansehen | Dort steht **„+ kg"** statt „kg" |
| 8.3 | Auf ein Gewichtsfeld tippen | Der Ziffernblock sagt **„Zusatz (kg)"** |
| 8.4 | 3 × 8 Klimmzüge ohne Zusatz eintragen, abschließen | Im Abschluss-Dialog steht ein Volumen **deutlich über null** (bei 85 kg: 2.040 kg) |
| 8.5 | Eine Plank eintragen | **Kein** Körpergewichtshinweis — gehaltene Übungen bleiben bei Wiederholungen |

---

## 9 · Fortschritt pro Übung

Am Handy, als Athlet, unter **Fortschritt**.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 9.1 | Seite öffnen | Oben „Deine Übungen" mit bis zu vier Kurven — beim ersten Mal automatisch die häufigsten |
| 9.2 | „Auswählen" antippen | Liste **aller** je getrackten Übungen, mit Satzzahl und letztem Datum |
| 9.3 | Eine Übung suchen, die du nur einmal gemacht hast | Sie steht in der Liste. Genau das war die Anforderung |
| 9.4 | Mehr als acht anhaken | Ab der neunten kommt ein Hinweis, statt dass etwas passiert |
| 9.5 | Auswahl ändern, „Übernehmen", Seite neu laden | Auswahl ist noch da — sie liegt in der Datenbank, nicht im Browser |
| 9.6 | Weiter unten schauen | „Volumen je Trainingstag" mit Vergleich zur vorigen Einheit |

Und dieselbe Sache **coachseitig**, am Mac in der Klientenakte:

| # | Was du tust | Was passieren muss |
|---|---|---|
| 9.7 | Klientenakte öffnen | Statt „Fortschritt pro Bewegungsmuster" steht dort **„Fortschritt pro Übung"** |
| 9.8 | „Übungen wählen" antippen, andere Übungen anhaken, übernehmen | Kurven wechseln |
| 9.9 | Am Handy als **Athlet** die Fortschrittsseite neu laden | **Seine Auswahl ist unverändert.** Trainer und Athlet wählen getrennt |

---

## 10 · Trainer trackt für den Klienten

**Am Handy**, eingeloggt als **Coach**. Das ist der Punkt, der „mit
Trainer" überhaupt erst mit Inhalt füllt.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 10.1 | In der Navigation auf **Tracken** | Liste deiner aktiven Klienten, je mit Plan und Tagesanzahl |
| 10.2 | Einen Klienten wählen | Oben ein dunkles Band: „Du trackst für **Name**" — bleibt beim Scrollen stehen |
| 10.3 | Trainingstag wählen | Der fällige Tag trägt die Markierung „dran" |
| 10.4 | Sätze eintippen | Felder sind direkt beschreibbar, kein Ziffernblock — du hast beide Hände frei |
| 10.5 | „Letztes Mal … übernehmen" antippen | Gewichte der letzten Einheit stehen in allen Sätzen |
| 10.6 | Speichern | Bestätigung mit Satzzahl und Volumen |
| 10.7 | In die **Klientenakte** wechseln | Die Einheit steht dort mit dem Zusatz **„von dir erfasst"** |
| 10.8 | Am zweiten Gerät als **Athlet** einloggen | Unter „Zuletzt trainiert": **„von deinem Trainer eingetragen"** |

Schritt 10.7 und 10.8 sind der eigentliche Test. Sie zeigen, dass
`recorded_by` ankommt — die Zahl, aus der später die Betreuungsquote
fürs Ketten-Dashboard entsteht.

---

## 11 · Zwei Dinge, die schiefgehen dürfen

Beides ist bekannt und kein Fehler im Code:

- **iPhone gesperrt, Pause läuft ab** → der Ton kommt verspätet beim
  Entsperren. iOS friert JavaScript bei gesperrtem Bildschirm ein. Der
  Wake Lock hält den Bildschirm während der Einheit an, wasserdicht wird
  es erst mit einer nativen App.
- **Athlet hat nie ein Gewicht gemeldet** → Klimmzüge bleiben auf der
  Wiederholungsskala und tragen null zum Kilogramm-Volumen bei. Die App
  sagt es beim Loggen dazu. Das ist Absicht: lieber keine Zahl als eine
  geratene.

---

## 12 · Auf dem Homescreen

Das ist der Unterschied zwischen „Website auf dem Handy" und „App".

**iPhone (Safari):** Seite öffnen → Teilen-Symbol → *Zum Home-Bildschirm*.
**Android (Chrome):** Menü → *App installieren* oder *Zum Startbildschirm*.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 12.1 | Icon auf dem Homescreen ansehen | Das PTHREE-Zeichen, nicht ein Screenshot der Seite |
| 12.2 | Von dort starten | **Keine Adresszeile, keine Browser-Knöpfe.** Eigener Eintrag im App-Umschalter |
| 12.3 | Oben schauen | Uhrzeit und Batterie sind sichtbar, der Kopf der App liegt darunter — nicht dahinter |
| 12.4 | Als Coach: unten schauen | **Leiste mit sechs Punkten** statt der Kopfnavigation, die vorher waagerecht wegscrollte |
| 12.5 | Auf einen Punkt tippen | Seite wechselt. Der aktive Punkt trägt **drei** Merkmale: einen roten Balken oben am Feld, eine rosa Pille hinter dem Symbol, dunkelrote Schrift |
| 12.6 | Ganz nach unten scrollen | Die letzte Karte endet über der Leiste, nicht darunter |
| 12.7 | Icon lange gedrückt halten | Kurzbefehle *Training tracken* und *Eigenes Training* |
| 12.8 | Als Athlet dasselbe | Die gewohnte Leiste unten, oben kein grauer Balken mehr |
| 12.9 | Vom Icon starten und auf die erste Sekunde achten | **Kein weißer Blitz.** Sandfarbener Schirm mit dem Logo, dann wird die Marke von links aufgedeckt, dann die App |
| 12.10 | Flugmodus an, vom Icon starten | Das Startbild kommt trotzdem — es liegt auf dem Gerät. Danach die Fehlermeldung der Seite |
| 12.11 | In den iOS-Einstellungen *Bedienungshilfen → Bewegung reduzieren* einschalten, neu starten | Logo steht sofort still und blendet aus, kein Aufdecken |

**Der eigentliche Test ist 12.4.** Vorher war die Coach-Seite gestauchtes
Laptop-Layout mit einer Navigation, die man suchen musste. Wenn das jetzt
wie eine App aussieht, hat die Umstellung funktioniert.

**Und 12.5 und 12.6.** Beide Regeln standen im Stylesheet im falschen
Block — sie galten erst unter 360px Breite, also auf keinem iPhone der
letzten Jahre. Wer die Punkte vorher nicht farbig gesehen hat und wessen
letzte Karte unter der Leiste verschwand: Das war der Grund.

---

## 13 · Aus dem Meeting 16.09

Am **Handy**, als Trainer. Fünf Dinge, die zusammen entschieden haben,
ob die Trainerseite unterwegs benutzbar ist.

### 13.1 Uhr und Pause beim Tracken

| # | Was du tust | Was passieren muss |
|---|---|---|
| 13.1a | *Tracken* → Klient → Trainingstag antippen | Oben rechts **läuft eine Uhr** ab 0:00 |
| 13.1b | Bei der ersten Übung Gewicht und Wdh. eintragen, dann woanders hintippen | Unten fährt die **Pausenleiste** hoch und zählt rückwärts |
| 13.1c | Warten, bis sie bei 0:00 ist | Drei aufsteigende Töne, Vibration, Leiste wird grün und sagt *Pause vorbei* |
| 13.1d | Dieselbe Zahl noch einmal korrigieren | Pause startet **nicht** erneut — der Satz gilt als gemacht |
| 13.1e | *Pause* an einer Übung antippen | Pause startet von Hand, mit der Vorgabe aus dem Plan |
| 13.1f | ❚❚ neben der Uhr antippen, 20 s warten, ▶ | Die Uhr steht still und läuft dann weiter — die Pause zählt nicht mit |
| 13.1g | Handy sperren, eine Minute warten, entsperren | Beide Uhren stimmen **sofort**. Sie rechnen aus Zeitstempeln, nicht aus Ticks |
| 13.1h | Ganz nach unten | Zwischen *Übung hinzufügen* und *Einheit speichern* liegt eine Trennlinie und echter Abstand |
| 13.1i | Speichern | Der Fertig-Schirm nennt die **Trainingszeit** mit |
| 13.1j | Einheit in der Akte nachsehen | Steht dort mit Dauer, nicht mit „keine Angabe" |

### 13.2 Die Veränderung in den Kurven

| # | Was du tust | Was passieren muss |
|---|---|---|
| 13.2a | Klientenakte → *Körperwerte* | Am Ende jeder Linie eine kleine Zahl in der Farbe der Linie: z. B. **−1,5 kg** |
| 13.2b | Am Chip darunter schauen | Dort steht derselbe Wert, dahinter *seit TT.MM.* |
| 13.2c | Auf *1 Monat* umschalten | Die Zahl **ändert sich** — sie meint immer den sichtbaren Zeitraum |
| 13.2d | Eine Kurve abschalten | Ihre Zahl verschwindet mit |
| 13.2e | Vier oder mehr Kurven anzeigen | Am Diagramm stehen keine Zahlen mehr, an den Chips schon — sonst würde der rechte Rand zur Liste |
| 13.2f | Genau hinschauen | **Nichts ist grün oder rot.** Das ist Absicht: −15 kg ist auf der Waage gut, beim Bankdrücken nicht |

### 13.3 Volumen einer einzelnen Übung

| # | Was du tust | Was passieren muss |
|---|---|---|
| 13.3a | Akte → *Fortschritt pro Übung* | Über der Kurve zwei Knöpfe: *Bestleistung* und *Volumen* |
| 13.3b | Auf *Volumen* | Die Kurve springt auf ganz andere Zahlen (Tausender), unter ihr steht die Erklärung |
| 13.3c | Die Zeile unter der Kurve | Zeigt jetzt die absolute Veränderung, z. B. **+1.040 kg (+65 %)** |
| 13.3d | Eine reine Körpergewichtsübung wählen, die nie ein Gewicht hatte | Ihr Volumen sind **Wiederholungen**, nicht 0 kg |
| 13.3e | Dasselbe als Athlet auf *Fortschritt* | Derselbe Umschalter, eigene Auswahl |

### 13.4 Das Zahnrad

| # | Was du tust | Was passieren muss |
|---|---|---|
| 13.4a | Klientenakte öffnen | Oben rechts, auf Höhe des Namens, ein Knopf **Zahnrad + „Ansicht"** — nicht nur ein Symbol |
| 13.4b | Antippen | Dialog *Akte einrichten* mit acht Abschnitten |
| 13.4c | *Letzte Einheiten* mit den Pfeilen ganz nach oben, *Übernehmen* | Die Akte beginnt mit den letzten Einheiten |
| 13.4d | *Coach-Hinweise* abwählen, *Übernehmen* | Der Block ist weg. Plan, Termine und Verwaltung stehen weiter rechts |
| 13.4e | **Einen anderen Klienten öffnen** | Dieselbe Anordnung. Die Einstellung gilt für alle |
| 13.4f | Alle abwählen und speichern wollen | *Mindestens ein Abschnitt muss sichtbar bleiben* |
| 13.4g | *Standard wiederherstellen*, *Übernehmen* | Ursprüngliche Anordnung, alles sichtbar |
| 13.4h | Neu laden | Die Einstellung hält — sie steht in der Datenbank, nicht im Browser |

### 13.5 Die Leiste am Laptop

| # | Was du tust | Was passieren muss |
|---|---|---|
| 13.5a | Am Mac durch die Menüpunkte klicken | Der aktive Punkt ist **rot hinterlegt mit Unterstrich**, nicht grau wie beim Darüberfahren |
| 13.5b | Mit dem Zeiger über einen anderen | Grau — deutlich unterscheidbar vom aktiven |

### 13.6 Kopfzeile und Spalten auf dem Handy

Die Stellen aus Aarons Screenshot vom 23.09.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 13.6a | Irgendeine Coach-Seite am Handy öffnen, ganz nach oben | Die Kopfzeile ist **eine Zeile hoch**: Marke links, Name und Abmelden rechts. Kein leeres Feld darunter |
| 13.6b | Die Marke ansehen | **PTHREE vollständig**, nicht oben abgeschnitten |
| 13.6c | Auf *Feed* | Die vier Kacheln stehen zu zweit nebeneinander, darunter die Hinweiskarten über die **volle Breite** |
| 13.6d | Die Hinweiskarte lesen | Normaler Zeilenumbruch. Kein Wort-für-Wort-Stapel, kein abgeschnittener Klientenname |
| 13.6e | Weiter nach unten | *Nächste Termine* und *Offene Check-ins* stehen **unter** den Hinweisen, nicht in einer schmalen Spalte daneben |
| 13.6f | Klientenakte öffnen | Gleiches Bild: eine Spalte |
| 13.6g | Plan-Editor → Slot anlegen | Sätze / Wdh. von / Wdh. bis brechen um, statt drei Felder in Handybreite zu quetschen |

**Woran es lag:** Die Kopfzeile trägt dieselbe Klasse wie der Seiteninhalt
und erbte deren unteren Innenabstand — den Platz für die Tab-Leiste. Mit
`box-sizing: border-box` frisst der die 60px Höhe vollständig auf: Marke
und Name werden nach oben herausgedrückt und abgeschnitten, darunter
bleibt ein leeres Feld.

Und die Spalten des Feeds standen als Inline-Style im JSX statt als
Klasse. Ein `style`-Attribut schlägt jede Media-Query — dieselbe Ursache
wie bei der Kopfnavigation eine Woche vorher. `check-layout.mjs` findet
beides jetzt.

---

## 14 · Fortschrittsfotos

Der Block, für den Joel die Testversion will. **Nimm zwei echte Fotos
mit dem Handy** — ein Bildschirmfoto reicht nicht, weil es die Fälle
mit Drehung und EXIF nicht auslöst.

### 14.1 Einwilligung

Als **Athlet**, am Handy.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 14.1a | *Fortschritt* öffnen | Unter der Überschrift eine Karte **Fotos** mit Pfeil |
| 14.1b | Antippen | Kein Upload-Knopf, sondern sechs Fragen und Antworten, darunter *Einverstanden* |
| 14.1c | Lesen | Es steht dort, wer die Bilder sieht, wo sie liegen, was mit dem Aufnahmeort passiert und wie man sie wieder los wird |
| 14.1d | *Einverstanden* | Jetzt erst erscheint die Aufnahmemaske |

### 14.2 Hochladen

| # | Was du tust | Was passieren muss |
|---|---|---|
| 14.2a | *Vorne*, Datum lassen, *Vorne aufnehmen* | Kamera oder Fotoauswahl öffnet sich |
| 14.2b | Ein **hochkant** aufgenommenes Foto wählen | Es erscheint **aufrecht**, nicht auf der Seite liegend |
| 14.2c | Auf die Wartezeit achten | Ein bis drei Sekunden. Länger heißt, das Verkleinern greift nicht |
| 14.2d | Zweites Bild, Datum auf **vor drei Monaten** setzen | Erscheint in der Galerie hinter dem neueren |
| 14.2e | Ein drittes als *Seite* | Der Vergleich bekommt Umschalter *Vorne / Seite* |

### 14.3 Der eigentliche Punkt

**Zuerst: der Vergleich steht auf der Fortschrittsseite selbst**, gleich
unter der Überschrift — nicht hinter einem Klick auf eine Unterseite.
Wer ihn suchen muss, sieht ihn einmal und danach nie wieder.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 14.3z | Als Athlet auf *Fortschritt* | **Vorher — Nachher** steht direkt da, mit Link *Alle Fotos* daneben. Erst ohne Bilder erscheint stattdessen die Einladung |
| 14.3a | Auf *Vorher — Nachher* schauen | Zwei Bilder **nebeneinander, gleich hoch** |
| 14.3b | Rechts oben | Die Spanne, z. B. *12 Wochen* |
| 14.3c | Wenn es Check-ins mit Gewicht gibt | Darunter die Differenz, z. B. **−6,5 kg in 12 Wochen** |
| 14.3d | Bei mehr als zwei Aufnahmen: Datum links umstellen | Bild und Spanne ändern sich mit |
| 14.3e | Ansicht umschalten | Vergleich springt auf die andere Pose, Auswahl setzt sich zurück |

Der voreingestellte Vergleich ist **ältestes gegen neuestes**, nicht die
letzten beiden. Zwei Aufnahmen im Abstand einer Woche unterscheiden sich
nicht sichtbar, und ein Vergleich, in dem man nichts sieht, entmutigt.

### 14.4 Trainerseite

Als **Trainer**, in der Klientenakte.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 14.4a | Akte öffnen, zum Abschnitt *Fotos* | Dasselbe Nebeneinander wie beim Athleten |
| 14.4b | Suchen, ob es einen Upload-Knopf gibt | **Gibt es nicht.** Nur ansehen — Absicht, siehe unten |
| 14.4c | Bei einem Klienten **ohne** Einwilligung | Ein Satz, der erklärt warum, und dass nur der Klient selbst zustimmen kann. Keine leere Fläche |
| 14.4d | Zahnrad → *Fotos* abwählen | Der Abschnitt verschwindet aus allen Akten |

### 14.5 Widerruf — der Fall, der wehtut

| # | Was du tust | Was passieren muss |
|---|---|---|
| 14.5a | Als Athlet ganz nach unten | *Einwilligung zurücknehmen*, mit dem Datum der Erteilung |
| 14.5b | *Zurücknehmen* | Nachfrage mit der **Anzahl** der Bilder — nicht einfach weg |
| 14.5c | Bestätigen | Seite zeigt wieder den Einwilligungstext, Galerie leer |
| 14.5d | Als Trainer die Akte neu laden | Auch dort sind die Bilder weg, nicht nur ausgeblendet |
| 14.5e | In Supabase: *Storage → progress-photos* | **Der Ordner des Klienten ist leer.** Das ist der eigentliche Test — ausgeblendet ist nicht gelöscht |
| 14.5f | `select * from verwaiste_fotos;` | Keine Zeile |
| 14.5g | Neu einwilligen | Geht. Die alten Bilder kommen nicht zurück — das ist richtig so |

### 14.6 Was die Datenbank verweigern muss

Im Supabase-SQL-Editor, angemeldet als der Athlet ist das nicht möglich —
deshalb hier über `check_schema.sql`:

| # | Was du tust | Was passieren muss |
|---|---|---|
| 14.6a | `check_schema.sql` ausführen | Alle 0020-Zeilen auf **OK** |
| 14.6b | Zeile *Upload braucht eine Einwilligung* | OK. Ohne sie könnte jemand an der App vorbei Bilder ablegen |
| 14.6c | Zeile *Bucket ist NICHT oeffentlich* | OK. Bei einem offenen Bucket reicht die geratene Adresse |
| 14.6d | Zeile *kein Foto ohne gueltige Einwilligung* | OK. Findet Bilder, die ein Widerruf übersehen hat |

**Warum der Trainer nicht hochladen darf:** Ein Trainer, der Körperfotos
seines Klienten selbst ins System legt, ist eine andere Rechtslage als
ein Athlet, der seine eigenen hochlädt. Und eine Einwilligung, die ein
anderer erteilt, ist keine. Wenn Joel das im Studio braucht, bauen wir
es bewusst dazu — mit eigener Einwilligung dafür.

---

## 15 · Der Feinschliff

Nichts davon ändert eine Funktion. Es geht darum, ob die App wirkt wie
gebaut oder wie zusammengesteckt.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 15.1 | Irgendwo einen Knopf antippen und den Finger draufhalten | Er wird **sofort** einen Hauch kleiner. Nicht erst, wenn die Seite reagiert |
| 15.2 | Einen deaktivierten Knopf antippen | **Nichts.** Eine Rückmeldung auf einem toten Knopf ist schlimmer als keine — man wartet dann auf etwas |
| 15.3 | Durch beide Bereiche scrollen | Schriftgrößen sitzen auf einem Raster. Keine Zeile, die um ein halbes Pixel neben der darüber liegt |
| 15.4 | Als Athlet trainieren, einen Satz über die alte Bestleistung eintragen | **„Neue Bestleistung · +x %"** erscheint in der Satzzeile, im selben Moment |
| 15.5 | Denselben Satz um 100 g erhöhen | **Keine** neue Meldung. Unter einem Prozent ist es Messrauschen |
| 15.6 | Vier Sätze über der alten Marke machen, dann *Training beenden* | Die Bilanz nennt die Übung **einmal**, nicht viermal |
| 15.7 | Auf dem Abschlussschirm auf die große Volumenzahl schauen | Sie läuft in einer halben Sekunde hoch |
| 15.8 | Als Trainer einen Check-in beantworten | Unten erscheint kurz **„Antwort geschickt"**. Vorher lud die Seite still neu, und man wusste nicht, ob es geklappt hat |
| 15.9 | Zahnrad → *Übernehmen* | **„Ansicht übernommen"** |
| 15.10 | *Bewegung reduzieren* in iOS einschalten, alles noch einmal | Keine Animationen mehr, aber die Rückmeldung beim Antippen bleibt — über Helligkeit statt Bewegung |

**Der eigentliche Test ist 15.5.** Epley reagiert auf jedes Gramm: Ohne
Schwelle wäre jeder zweite Satz eine „neue Bestleistung", und nach dem
dritten Mal glaubt es niemand mehr. Ein Prozent ist die Grenze.

---

## 16 · Profil des Athleten

Braucht **Migration 0021**.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 16.1 | Als Trainer einen Klienten anlegen, Geburtsdatum aus dem Erstgespräch eintragen | Wird gespeichert |
| 16.2 | Klientenakte → *Stammdaten* | E-Mail und Geburtsdatum stehen da und lassen sich korrigieren |
| 16.3 | Als Athlet: Leiste unten | **Fünf Punkte** — Heute, Plan, Check-in, Fortschritt, **Profil**. *Abmelden* ist raus |
| 16.4 | Auf *Profil* | Name, Geburtsdatum und E-Mail sind **vorausgefüllt** mit dem, was der Trainer eingetragen hat |
| 16.5 | Ein Profilbild wählen | Erscheint rund. Wird auf deinem Gerät verkleinert, Aufnahmeort bleibt dort |
| 16.6 | Noch ein Bild wählen | Ersetzt das alte. In Supabase → Storage → *avatars* liegt **nur eine** Datei im Ordner |
| 16.7 | Geburtsdatum auf 2206 tippen | „Das Geburtsdatum kann nicht stimmen." |
| 16.8 | E-Mail ändern und speichern | Hinweiskasten: Bestätigungsmail unterwegs, bis dahin gilt die alte Anmeldeadresse |
| 16.9 | Abmelden — ganz unten auf der Profilseite | Zurück zum Login |

### 16.10 Der Fall, der wehtut

Der Athlet darf **seine** Daten ändern, nicht die des Trainers. Im
Supabase-SQL-Editor:

```sql
-- Als Athlet angemeldet ginge das ueber die API. Hier nur der Beleg,
-- dass der Trigger existiert und greift:
select * from check_schema_0021;  -- oder check_schema.sql laufen lassen
```

Erwartung: Alle 0021-Zeilen auf **OK**, besonders *Athlet kann
Trainer/Level/Status NICHT umschreiben*.

**Warum das wichtig ist:** `clients_self_update` steht seit Migration
0002 im Schema — der Athlet durfte seine Zeile also schon immer
schreiben, inklusive `coach_id`, `level` und `status`. Aufgefallen ist
es nie, weil keine Oberfläche es angeboten hat. Zeilensicherheit
entscheidet über **Zeilen**, nicht über **Spalten**; der Trigger aus
0021 schließt die Lücke.

### 16.11 Die Leiste

| # | Was du tust | Was passieren muss |
|---|---|---|
| 16.11a | Durch die fünf Punkte tippen | Der aktive trägt jetzt dieselben drei Merkmale wie beim Trainer: **roter Balken oben**, rosa Pille hinter dem Symbol, dunkelrote Schrift |
| 16.11b | Auf *Fortschritt* → *Alle Fotos* | *Fortschritt* bleibt hervorgehoben — die Fotos hängen daran |
| 16.11c | Auf einem schmalen Gerät (≤360px) | Beschriftungen kleiner, nichts bricht um |

---

## 17 · Anmelden und Passwort vergessen

Setzt voraus: Resend läuft (siehe `RESEND-EINRICHTEN.md`) und Migration
0023 ist eingespielt. Ohne 0023 scheitert schon 17.1.

**Alles in diesem Abschnitt auf demselben Gerät machen.** Der Link aus
der Mail funktioniert nur in dem Browser, aus dem er angefordert wurde —
das ist kein Fehler, sondern der Gegenschlüssel, der beim Anfordern
lokal liegen bleibt.

### 17.1 Der Weg hinein ist dicht

| # | Was du tust | Was passieren muss |
|---|---|---|
| 17.1a | `/login` aufrufen | Nur noch **ein** Formular. Kein „Konto anlegen" mehr, dafür der Hinweis auf den Einladungslink |
| 17.1b | Mit falschem Passwort anmelden | „E-Mail oder Passwort stimmt nicht." — und zwar derselbe Satz wie bei einer Adresse, die es gar nicht gibt. Absicht: sonst verrät das Formular, wer hier ein Konto hat |
| 17.1c | Einen neuen Athleten über `/invite/[token]` anlegen | Klappt. Scheitert es mit einer Meldung über `user_role`, fehlt Migration 0023 |

### 17.2 Passwort zurücksetzen

| # | Was du tust | Was passieren muss |
|---|---|---|
| 17.2a | `/login` → **Passwort vergessen?** | Seite mit einem Feld |
| 17.2b | Joels Adresse eintragen, *Link schicken* | „Mail ist unterwegs." — und zwar mit **eurem** Absender, nicht `noreply@mail.app.supabase.io` |
| 17.2c | Eine Adresse eintragen, die es **nicht** gibt | Dieselbe Bestätigung. Auch das ist Absicht |
| 17.2d | Sofort nochmal dieselbe Adresse | „Warte eine Minute" — das ist *Minimum interval per user* aus den SMTP-Einstellungen, nicht ein Fehler |
| 17.2e | Link in der Mail anklicken | Formular „Neues Passwort", darüber die eigene Adresse |
| 17.2f | Zwei verschiedene Passwörter eintippen | Knopf bleibt aus, Hinweis steht sofort da — nicht erst nach dem Klicken |
| 17.2g | Das **alte** Passwort eintragen | „Das ist dein bisheriges Passwort." |
| 17.2h | Ein neues setzen | Landet direkt im richtigen Bereich — Athlet bei `/athlete`, Trainer bei `/coach` |
| 17.2i | Denselben Link **nochmal** anklicken | „Der Link ist abgelaufen oder wurde schon benutzt." Ein Link, der zweimal funktioniert, ist ein Link, der in einem fremden Postfach noch funktioniert |

### 17.3 Einladung (Stand 0024)

Die Adresse tippt der Klient **nicht** mehr selbst — sie kommt aus der
Klientenakte und steht auf der Einladeseite fest.

| # | Was du tust | Was passieren muss |
|---|---|---|
| 17.3a | Klient ohne hinterlegte E-Mail öffnen | Im Block *App-Zugang* steht ein roter Hinweis, dass die Adresse fehlt |
| 17.3b | E-Mail eintragen, speichern, Link erzeugen, Link öffnen | Die Adresse steht im Feld, grau hinterlegt, nicht änderbar. Nur das Passwort ist einzugeben |
| 17.3c | Passwort setzen, *Konto anlegen* | Landet im Athletenbereich, *Profil* zeigt die Daten — **nicht** „Zu diesem Zugang gehört kein Klientenkonto" |
| 17.3d | Denselben Link nochmal öffnen | „Einladung ungültig" — ein angenommener Link ist verbraucht |
| 17.3e | Neuen Link erzeugen, in einem **anderen** Browser mit einer **anderen** Adresse annehmen | Klare Absage: „Dieser Klient ist bereits mit einem anderen Zugang verknüpft." Früher lief das still durch und der Zweite stand in einer leeren App |
| 17.3f | Im Klientenfile *Zugang trennen* → *Trennen* | Meldung „Verknüpfung gelöst". Pläne, Einheiten, Check-ins und Fotos sind danach **alle noch da** |
| 17.3g | Neuen Link erzeugen und mit der zweiten Adresse annehmen | Klappt jetzt |

### 17.4 Die Fälle, die man vergisst

| # | Was du tust | Was passieren muss |
|---|---|---|
| 17.4a | `/auth/passwort/neu` direkt aufrufen, ohne Mail | Wirft zurück auf `/auth/passwort` mit dem Hinweis, dass der Link abgelaufen ist |
| 17.4b | Mail am Rechner anfordern, auf dem Handy öffnen | Sagt in Worten, dass es ein anderer Browser war — nicht „invalid request" |
| 17.4c | Eine Stunde warten, dann klicken | Abgelaufen. Neu anfordern geht beliebig oft |

---

## Wenn etwas hakt

- **Änderung nicht sichtbar** → Server neu starten. Der Dev-Server
  merkt sich Server-Komponenten manchmal zu lange.
- **„Failed to fetch"** → Supabase nicht erreichbar. Erst
  `https://axynlgtllodhclrzcugh.supabase.co/auth/v1/health` im Browser
  prüfen.
- **Handy kommt nicht rein** → IP in `.env.local` veraltet. Neu setzen,
  Server neu starten.
- **Homescreen-App zeigt alte Stände** → Sie hält eine eigene Sitzung.
  Einmal schließen und neu starten; im Zweifel vom Homescreen löschen und
  neu ablegen.
- **Falscher Bereich** → Ein Browser trägt eine Sitzung. Coach und Athlet
  gleichzeitig geht nur mit einem privaten Fenster.
- **Kurven fehlen nach dem Umstieg auf Körpergewicht** → gewollt. Punkte
  aus der Zeit ohne gemeldetes Gewicht liegen auf der Wiederholungsskala
  und gehören nicht in dieselbe Linie. Unter der Kurve steht, wie viele
  es sind.
- **„Tracken" führt zu einem leeren Klienten** → Der Klient ist nicht auf
  `aktiv` gesetzt. Die Liste zeigt bewusst nur aktive.
- **Kein Ton am Ende der Pause beim Coach-Tracking** → Derselbe Grund wie
  auf der Athletenseite: Der Tonkanal öffnet sich nur aus einer
  Fingerbewegung heraus. Er wird beim Antippen des Trainingstags
  geöffnet. Wer über einen Link direkt in die Satzmaske springt, hat
  keine solche Bewegung gemacht — dann bleibt es still. Die Vibration
  kommt trotzdem.
- **Zahnrad zeigt einen Abschnitt, den es nicht mehr gibt** → Kann nicht
  passieren, unbekannte Schlüssel werden übergangen. Umgekehrt gilt:
  Abschnitte, die später dazukommen, tauchen von selbst hinten in deiner
  Anordnung auf, auch wenn du schon einmal etwas eingestellt hast.
- **Zahl an der Kurve fehlt** → Es gibt nur einen Punkt im gewählten
  Zeitraum. Eine Veränderung braucht zwei.
- **Foto liegt auf der Seite** → Die Drehung eines Handyfotos steht im
  EXIF, und das wird beim Verkleinern bewusst entfernt. Deshalb läuft
  das Bild über ein `<img>`-Element, das die Drehung vorher anwendet.
  Passiert es trotzdem, ist es ein Browser, der `image-orientation`
  nicht beachtet — bitte melden, mit Gerät und Fassung.
- **„new row violates row-level security policy" beim Hochladen** →
  Keine gültige Einwilligung. Genau so soll es sein: Die Datenbank
  verweigert den Upload, nicht die Oberfläche.
- **Bilder laden nicht, graue Fläche mit „nicht ladbar"** → Die
  signierten Adressen laufen nach einer Stunde ab. Seite neu laden.
- **Keine Gewichtsdifferenz unter dem Vergleich** → Es fehlt auf einer
  der beiden Seiten ein Check-in innerhalb von drei Wochen um den
  Aufnahmetag. Eine Differenz gegen eine fehlende Zahl wäre erfunden.
- **Weißer Schirm statt Startbild beim Öffnen vom Homescreen** → iOS
  wählt das Startbild über Punktgröße UND Pixeldichte des Geräts aus.
  Passt keine Zeile, gibt es keins. Gerät in
  `apps/coach/scripts/startup-images.py` eintragen, Skript laufen
  lassen, Ausgabe in `app/layout.tsx` übernehmen.
- **Passwort-Link landet auf der Startseite statt auf dem Formular** →
  Die Adresse, von der aus du angefordert hast, steht nicht unter
  *Authentication → URL Configuration → Redirect URLs*. Supabase
  ersetzt sie dann still durch die *Site URL*. Beim lokalen Testen
  gehört `http://localhost:3000/**` dort hinein.
- **„Der Link wurde in einem anderen Browser geöffnet"** → Stimmt genau
  so und ist kein Fehler. Beim Anfordern legt der Browser einen
  Gegenschlüssel ab, der nicht mitwandert. Neu anfordern und die Mail
  auf demselben Gerät öffnen.
- **Registrierung scheitert mit `invalid input value for enum
  user_role`** → Migration 0023 fehlt. Bis sie eingespielt ist,
  scheitert **jede** Registrierung, auch die über den Einladungslink.
- **Startanimation läuft bei jedem Neuladen** → So gewollt. Sie hängt an
  einem echten Seitenaufruf, nicht am Tippen auf einen Menüpunkt. Beim
  Entwickeln am Mac fällt sie deshalb öfter auf als im Betrieb.
