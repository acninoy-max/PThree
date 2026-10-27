# Umsetzungsplan nach dem Meeting vom 27.10.2026

**Stand:** 1–5 live. 6 (Einheit bestätigen, Trainer) mit 0033 live.
7a (Coaching-Art, Rhythmus je Bereich, Trainer trägt ein) mit 0034
gebaut. 7b (tägliche Werte) bleibt zurückgestellt: Check-ins bleiben
wöchentlich (Entscheidung 27.10.).

Grundlage: Notizen aus dem Meeting mit Joël. Jeder Punkt ist gegen den
Code geprüft. Was „Befund" heißt, steht so im Code, nicht vermutet.

---

## 1. Kalenderzeit falsch  ·  Fehler, zuerst  ·  ½–1 Tag

**Befund:** Die App rechnet Uhrzeiten an zwei Stellen in zwei
verschiedenen Zeitzonen.

- Beim **Anlegen** liest der Server „06:00" ein. Der Server (Vercel)
  läuft in UTC, also wird daraus 06:00 UTC, in Amsterdam aber 08:00.
- Der **Kalender** wird im Browser gezeichnet, also in Amsterdamer Zeit:
  Er zeigt 08:00.
- **Feed und Athleten-App** werden auf dem Server gezeichnet, also in
  UTC: Sie zeigen 06:00, „wie eingegeben".
- Die **Termine in der Klientenakte** zeichnet erst der Server (UTC),
  dann der Browser (Amsterdam). Die beiden Fassungen weichen ab; je
  nach Gerät steht dort die eine oder die andere Zeit, und React meldet
  einen Hydration-Fehler.

Genau Joëls Beobachtung: 06:00 eingegeben, Kalender zeigt 08:00, Feed
zeigt 06:00. Mit 04:00 eingegeben stimmte der Kalender (06:00), der Feed
nicht mehr (04:00). Seit der Zeitumstellung am 25.10. ist der Abstand
nur noch eine Stunde statt zwei.

**Folge für Klienten:** Die Athleten-App zeigt dieselbe falsche UTC-Zeit
wie der Feed. Wer sich darauf verlässt, steht zur falschen Zeit im Studio.

**Lösung:**
- Eine feste Zeitzone für die App: `Europe/Amsterdam` (alle Trainer und
  Klienten sitzen in NL/DE). Alle Uhrzeiten in `t.fmt` werden in dieser
  Zone gerechnet, auf dem Server wie im Browser.
- Beim Anlegen wird „Datum + Uhrzeit" in dieser Zone in einen Zeitpunkt
  umgerechnet, nicht in der Zone des Servers.
- Wiederkehrende Termine über die Zeitumstellung hinweg bleiben um
  06:00, statt um eine Stunde zu springen (heute rechnet der Server die
  Wiederholungen in UTC).
- Tests für Sommer- und Winterzeit im App-Testlauf.
- **Bestehende Termine:** Alle, die bisher angelegt wurden, liegen in der
  Datenbank um 1–2 Stunden falsch (im Sommer zwei, ab 25.10. eine).
  Einmalige Korrektur per SQL-Befehl, den du einspielst, nachdem du die
  Liste geprüft hast. Joëls von Hand verschobene Termine (04:00 für 06:00)
  stehen in der Datenbank zufällig richtig und müssen ausgenommen werden;
  deshalb erst ansehen, dann korrigieren.

## 2. Gewicht vom letzten Mal je Satz  ·  1 Tag  ·  keine Migration

**Befund:** „Last time" nimmt den **besten** Satz der letzten Einheit
und schreibt ihn in alle Sätze. Bei Aufwärmsätzen (Ramp-up) ist das
falsch: Satz 1 war 40 kg, Satz 4 war 80 kg, die App schlägt überall 80
vor.

**Lösung:**
- Jeder Satz zeigt als **grauen Platzhalter** genau, was in **diesem**
  Satz letztes Mal stand: Satz 1 „40 × 10", Satz 2 „60 × 8" usw.
- Antippen von „Last time" übernimmt die Werte Satz für Satz, nicht mehr
  den Bestwert für alle.
- Startgewicht aus dem Plan (B5) zählt nur, wenn es noch keine
  Vorgeschichte für die Übung gibt.
- Athlet und Trainer-Tracking gleich.

## 3. Trainingshistorie für den Klienten  ·  ½–1 Tag

**Befund:** Der Trainer sieht vergangene Einheiten in der Akte, der
Klient nirgends.

**Lösung:** In der Athleten-App unter Plan ein Reiter **History**: Liste
der Einheiten (Datum, Tag, Dauer, Volumen), aufklappbar mit allen
Sätzen. Dazu auf „Heute" nach einer Einheit die Karte „Das hast du heute
gemacht" mit den Übungen (Teile davon gibt es schon).

## 4. Mehrere Pläne gleichzeitig, alte bleiben nutzbar  ·  1–2 Tage

**Befund:** Die Datenbank erlaubt schon mehrere aktive Pläne je Klient.
Die App nimmt aber immer nur den neuesten (`fetchActivePlan`), und
„Zuweisen" schaltet den bisherigen still ab.

**Lösung:**
- **Mehrere aktive Pläne nebeneinander**, z. B. „mit Coach" und „solo".
  Beim Zuweisen die Wahl: *Neben den aktuellen Plan stellen* oder *Den
  aktuellen ersetzen*.
- **Training starten** zeigt die Tage aller aktiven Pläne, nach Plan
  gruppiert.
- **Inaktive Pläne** stehen grau unter „Archiv": einsehbar und weiter
  startbar, nur nicht mehr vorgeschlagen.
- Keine Migration nötig, nur App.

## 5. „Lisa Lisa Fullbody"  ·  Fehler  ·  1 Stunde

**Befund:** Wird ein Programm, dessen Name schon den Vornamen trägt
(z. B. aus „Save as program" oder von Hand so benannt), demselben
Klienten zugewiesen, setzt der Vorschlag den Vornamen ein zweites Mal
davor.

**Lösung:** Steht der Vorname schon am Anfang, wird er nicht noch einmal
vorangestellt. „Save as program" nimmt den Vornamen ab (macht es schon,
aber nur bei exakter Schreibweise; künftig ohne Groß/Klein-Unterschied).

## 6. Einheit bestätigen  ·  1–2 Tage  ·  Migration  ·  ❓ Rückfrage

**Notiz:** Die Abschlussanzeige „Session complete" sieht gut aus, muss
aber bestätigt werden, weil sie später die Grundlage einer Rechnung ist.

**Verständnis (bitte bestätigen):** Eine Einheit **mit Trainer** braucht
eine Bestätigung durch den **Klienten**, damit sie später abgerechnet
werden kann. Ablauf:
- Trainer speichert die Einheit → beim Klienten erscheint
  „Einheit mit Joël am 27.10., 60 Min. — Bestätigen / Stimmt nicht".
- Trainer sieht in der Akte: bestätigt, offen oder beanstandet.
- Bestätigt ist fest (nicht mehr änderbar durch den Trainer, Trigger).
- Spalten `confirmed_at`, `disputed_at` an `sessions` (oder an
  `appointments`, wenn der **Termin** die Abrechnungseinheit ist) mit
  RLS und Spaltenschutz.

**Offen:** Ist die Abrechnungseinheit die *getrackte Einheit* oder der
*Termin im Kalender*? Und bestätigt der *Klient* oder nur der *Trainer*
(„ja, hat stattgefunden")?

## 7. Check-ins: Online vs. Personal  ·  2–4 Tage  ·  Migration  ·  ❓ Rückfrage

**Notizen:** Bei Online-Klienten muss der Klient die Maße selbst
eintragen, bei Personal-Training der Trainer. Beim Anlegen „Online
coaching" oder „Personal coaching" wählen. Rhythmus nicht nur für Maße,
sondern auch für Gewicht, Schlaf usw. (täglich, jeden zweiten Tag,
wöchentlich, alle 2 Wochen). Trainer soll Check-in und Maße für den
Klienten eintragen können, wenn er ihn sieht.

**Befund:**
- Check-ins sind heute **einer je Woche** (`unique (client_id,
  week_of)`). Täglich oder jeden zweiten Tag passt da nicht hinein. Das
  ist der größte Umbau in dieser Liste.
- Der Trainer kann heute **kein** Check-in eintragen; die Spalten sind
  per Trigger dem Klienten vorbehalten (`guard_check_in_columns`).
- Der Rhythmus ist heute nur für Maße einstellbar (1, 2, 4, 8, 12
  Wochen).

**Vorschlag in zwei Stufen:**
- **7a (zuerst, 1–2 Tage):** Feld „Coaching type" beim Anlegen
  (Online / Personal / beides). Trainer darf Check-in und Maße für den
  Klienten eintragen („Eingetragen von Joël"). Rhythmus je Bereich
  (Gewicht, Schlaf/Befinden, Maße, Fotos) in Wochen.
- **7b (später, 2+ Tage):** Tägliche Werte (Gewicht, Schlaf) als eigene
  kleine Einträge statt im Wochen-Check-in. Erst wenn klar ist, dass
  Trainer das wirklich nutzen; tägliches Abfragen nervt Klienten schnell.

**Offen:** Reicht für den Anfang „wöchentlich / alle 2 Wochen /
monatlich" für alles, oder ist **täglich** für Joëls Online-Klienten ein
Muss?

---

## Reihenfolge

1. **Kalenderzeit (1)** und **Lisa Lisa (5)**: Fehler, sofort.
2. **Gewicht je Satz (2)** und **Historie für Klienten (3)**.
3. **Mehrere Pläne (4)**.
4. **Check-ins 7a**, **Einheit bestätigen (6)**: nach Antwort auf die
   Rückfragen.
5. **Check-ins 7b**: später, wenn gebraucht.

## Von euch gebraucht

- Antwort zu **6**: Was wird abgerechnet (Einheit oder Termin), und wer
  bestätigt?
- Antwort zu **7**: Ist täglich ein Muss?
- Nach dem Kalender-Fix: kurz die Liste der bestehenden Termine ansehen,
  bevor die Korrektur eingespielt wird.
