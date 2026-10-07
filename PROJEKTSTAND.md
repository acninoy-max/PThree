# PTHREE — Projektstand

Stand: 7. Oktober 2026. Übergabedokument.

Dieses Dokument ist für jemanden geschrieben, der das Projekt noch nicht
kennt und ab morgen daran weiterbaut. Es sagt nicht nur, **was** gebaut
ist, sondern **warum es so gebaut ist** und **wo die Fallen liegen** —
denn die stecken hier fast alle in der Datenbank, nicht im Code, und
keine davon wirft eine Fehlermeldung.

Lies mindestens die Abschnitte 3 (Eigenheiten), 4 (Prüfungen) und 7
(Fehlerklassen), bevor du etwas änderst.

---

## 1. Was das Produkt ist

PTHREE ist eine SaaS für freelance Personal Trainer. Der Trainer baut
Pläne, trackt Einheiten und sieht den Fortschritt seiner Klienten; der
Klient trainiert in einer Mobil-Ansicht nach Plan, trägt Sätze ein,
schickt Check-ins mit Gewicht und Maßen und lädt Fortschrittsfotos hoch.

Die Verkaufsgeschichte Richtung Studioketten ist ein QA-Dashboard, mit
dem eine Kette die Qualität ihrer Trainer sehen kann. Das ist gebaut als
Idee, nicht als Code.

**Rollen im Projekt:** Aaron (NINOY GmbH) — Strategie, Produkt,
Ökonomie, Bau. Joël Hogenkamp — Vertrieb, Fachlichkeit, Testen,
BV-Gründung. Beteiligung 50/50, operative BV in Amsterdam geplant.

**Betriebszustand heute:** Die App läuft öffentlich unter
`https://pthree-wine.vercel.app`. Aaron und Joël haben Trainerkonten.
Joël hat am 01.10. den ersten vollständigen Test gemacht (Ergebnis in
Abschnitt 8). Echte Klienten sind **nicht** zugelassen, siehe Abschnitt
9.

---

## 2. Technischer Aufbau

**Monorepo** (Turborepo + pnpm):

```
apps/coach           Next.js 14.2.15, App Router — beide Oberflächen
packages/types       Domänenmodell, reine Typen
packages/db          Supabase-Anbindung und Abfragen
packages/coach-engine Rechenlogik: Volumen, 1RM, Verläufe, Hinweise
packages/tokens      Farben, Abstände, Kontrastrechnung
supabase/migrations  25 Migrationen, einzeln von Hand eingespielt
```

Rund 27.000 Zeilen TypeScript, 3.900 Zeilen SQL, 77 Übungen in der
globalen Bibliothek, 24 Routen.

**Eine App, zwei Oberflächen.** `/coach/*` ist ein helles
Editorial-Theme für den Trainer, `/athlete/*` eine mobil optimierte
Ansicht für den Klienten. Die Weiche steckt in `middleware.ts` und
entscheidet nach `profiles.role`.

**Supabase** liefert Postgres, Auth und Storage. Mailversand läuft über
**Resend** als SMTP-Relay (Einrichtung: `RESEND-EINRICHTEN.md`).
**Vercel** baut aus GitHub `acninoy-max/PThree`, Branch `main`, Root
Directory `apps/coach`.

### Die wichtigste Architekturentscheidung

**Die Zeilensicherheit von Postgres (RLS) ist die Sicherheitsgrenze, nicht
der Anwendungscode.** Die App filtert nirgends nach `coach_id` — sie
fragt einfach, und die Datenbank gibt nur heraus, was dem Angemeldeten
gehört. Wer eine neue Tabelle anlegt, legt eine Regel dazu an, sonst ist
sie für jeden Angemeldeten offen.

Daraus folgt eine Regel, die hier mehrfach verletzt wurde und jedes Mal
Stunden gekostet hat: **Prüfungen gehören in die Datenbank, nicht nur in
eine Server Action.** Eine Prüfung, die nur im Code steht, fällt weg,
sobald jemand eine zweite Schreibstelle baut.

---

## 3. Eigenheiten, die man nicht erraten kann

Jede dieser Zeilen steht hier, weil sie einmal einen Tag gekostet hat.

### Datenbank

**RLS entscheidet über Zeilen, nicht über Spalten.** Ein Athlet darf
seine `clients`-Zeile schreiben — damit dürfte er ohne Weiteres auch
`coach_id` und `status` ändern. Spaltenschutz braucht einen Trigger:
`guard_client_self_edit` (0021/0025), `guard_check_in_columns` (0007).

**`auth.uid()` ist nicht die Datenbankrolle.** Eine Funktion mit
`security definer` wechselt die Rolle, aber `auth.uid()` liest weiter
den Anspruch aus dem Token. Trigger, die auf `auth.uid()` prüfen, feuern
also auch innerhalb solcher Funktionen. Genau daran ist jede Einladung
gescheitert (siehe 0025).

**Views laufen mit den Rechten des Eigentümers**, nicht des Aufrufers —
außer man setzt `with (security_invoker = true)`. Supabase vergibt
zusätzlich Leserechte auf alles in `public`. Beides zusammen macht aus
einer Hilfs-View ein Fenster an der Zeilensicherheit vorbei (0022).

**Postgres garantiert keine Auswertungsreihenfolge bei `and`.** In
`storage.objects`-Regeln darf man sich nicht darauf verlassen, dass eine
Typprüfung vor dem Cast läuft — dafür gibt es `safe_uuid()` (0020).

**`create function` prüft den Rumpf von plpgsql nicht.** Eine Migration
kann erfolgreich melden und trotzdem bei jedem Aufruf scheitern. Deshalb
`check_enums.py`.

**Enum-Werte: `user_role` kennt `coach`, `athlete`, `org_admin`.** Es
gibt **kein** `client` — so heißt die Tabelle, nicht die Rolle. Diese
Verwechslung hat einmal jede Registrierung lahmgelegt (0023).

### Oberfläche

**Ein `style`-Attribut schlägt jede Regel aus dem Stylesheet, auch die
aus `@media`.** Zweimal ist dadurch das Mobil-Layout gebrochen. Dagegen
läuft `check-layout.mjs`.

**Alle Schriftgrößen sind Token** (`--pt-fs-*` in `globals.css`). Freie
Zahlen im Markup meldet `check-scale.mjs`. Einzige Ausnahme:
`app/global-error.tsx`, weil dort das Stylesheet möglicherweise nicht
geladen ist.

**Zwei Sprachen, eine Quelle.** Die Oberfläche ist Englisch (Standard)
und Deutsch. Die Texte stehen in `app/i18n/de` und `app/i18n/en`; `de`
gibt die Form vor, `en` muss sie erfüllen, sonst meldet es `tsc`. Die
Sprache entscheidet der **Server** aus Cookie `pt_lang`, sonst aus der
Browser-Sprache, sonst Englisch — und reicht nur den Code an den
Browser. Würde der Browser selbst entscheiden, gäbe es auf jeder Seite
einen Hydration-Fehler.

**Datumsformatierung nur über `app/format.ts`** (in Komponenten als
`t.fmt`). `toLocaleDateString`
liefert in Node und in mobilem Safari unterschiedliche Ergebnisse — das
erzeugt Hydration-Fehler, die nur auf dem Handy auftreten. Dagegen läuft
`check-format.mjs`.

**Aus einer `"use server"`-Datei darf nur Asynchrones exportiert
werden**, und eine Server-Komponente darf einer Client-Komponente keine
**Funktion** als Prop geben. Beides ist typseitig korrekt und bricht
trotzdem. Dagegen läuft `check-actions.mjs`.

**`navigator.vibrate` gibt es auf iOS nicht.** Nur Android.

**Nach dem Anmelden `window.location.assign()`, kein `router.push`.** Die
Rollenweiche sitzt in der Middleware und auf `/`; ein Wechsel ohne neue
Anfrage läuft daran vorbei.

### Fachlichkeit

**Zwei Skalen, die nie in einer Linie gemischt werden:** Kilogramm und
Wiederholungen. Eine Klimmzug-Kurve ohne bekanntes Körpergewicht läuft
auf der Wiederholungsskala; kommt später ein Gewicht dazu, bricht die
Kurve — deshalb `comparableExercisePoints`.

**Wirksame Last** = `bodyLoadKg + max(0, weightKg)`. Körpergewichtsanteil
je Übung, siehe `KOERPERGEWICHT-Faktoren.md`.

**1RM nach Epley.** 100 kg × 8 Wdh ergibt 126,67 — nicht 133.

**Farben werden vor dem Ausliefern gegen WCAG 2.1 AA gerechnet**
(`packages/tokens/src/contrast.ts`).

---

## 4. Prüfungen — vor jedem Commit

```bash
cd ~/Desktop/Q/ptfive
bash pruefen.sh
```

Zehn Prüfungen, bricht nicht beim ersten Fehler ab, listet am Ende auf,
was gerissen ist. Erwartung: `✓ Alle zehn Pruefungen sauber.`

| Prüfung | Was sie fängt |
|---|---|
| `tsc` | Typen, Signaturen, vergessene Felder |
| `check-format.mjs` | gebietsabhängige Datumsformate außerhalb `format.ts` |
| `check-layout.mjs` | Inline-Styles, die eine Media-Query aushebeln |
| `check-actions.mjs` | die zwei Server/Client-Regeln oben |
| `check-scale.mjs` | freie Schriftgrößen, tote Token |
| `check-texte.mjs` | Texte am Wörterbuch vorbei; Obergrenze je Datei in `texte-baseline.json`, darf nur sinken |
| `check_sql.py` | SQL-Syntax aller Migrationen (braucht `pglast` in `.venv`) |
| `check_enums.py` | Rollen-Namen gegen die echten Enum-Werte |
| Engine-Tests | 84 Tests (Textbausteine sind in die App-Tests gewandert) |
| App-Tests | 56 Tests, darunter Formate und Wörterbücher je Sprache |

**Jeder dieser Prüfer hat eine Selbstprüfung und endet mit Code 2, wenn
er sein eigenes Fundament nicht findet.** Grund: Die erste Fassung von
`check-actions.mjs` und `check-layout.mjs` meldete Entwarnung, obwohl
sie blind für genau den Fehler war, für den sie gebaut wurde. Wer einen
neuen Prüfer schreibt, baut den Fehler einmal absichtlich wieder ein und
sieht nach, ob er anschlägt.

**Die Datenbank prüft `supabase/check_schema.sql`** im SQL-Editor —
eine einzige Anweisung, weil der Editor nur das Ergebnis der letzten
zeigt. Erwartung: keine Zeile mit `>>> FEHLT <<<`.

**Der Bau läuft mit `pnpm build` im Wurzelverzeichnis**, nicht mit
`npx next build`. Letzteres sucht `app` neben sich und lädt sich
außerdem die neueste Next-Fassung aus dem Netz statt der festgelegten
14.2.15.

### Umgebung

- Entwicklung: `pnpm dev` → `http://localhost:3000`
- Umgebungsvariablen in `apps/coach/.env.local`, nicht in Git
- `pglast` liegt in `.venv` im Projekt (Homebrew-Python lässt sich seit
  PEP 668 nicht direkt beschreiben; `--break-system-packages` kann
  Homebrew zerlegen)

---

## 5. Was gebaut ist

**Trainerseite:** Klientenverwaltung mit Einladungslink, Zielen und
Notizen · Plan-Builder mit Slots, Supersätzen, Tempo, Satzpausen,
betreuten Tagen und Wochentagen · Übungsbibliothek mit eigenen Übungen,
Haupt- und Nebengruppen · Wochen- und Monatskalender ·
Check-in-Posteingang mit Antwort · Fortschritt pro Übung, Auswahl je
Betrachter · Volumen je Trainingstag · Tracken am Handy für den Klienten
· frei zusammenstellbare Klientenakte · Fotovergleich.

**Athletenseite:** Tagesdashboard · Training nach Plan mit Ziffernblock,
Uhr, Pausen-Timer und Bestleistungs-Moment · Check-in mit Gewicht und
fünf Maßen · Fortschritt mit Kurven und Vorher-Nachher-Fotos · Profil
mit Geburtsdatum, Bild und E-Mail · Fortschrittsfotos mit Einwilligung
nach Art. 9 DSGVO.

**Rundherum:** Anmeldung, Passwort vergessen (`/auth/passwort`,
`/auth/callback`, `/auth/passwort/neu`), Einladungsstrecke, 404,
Fehlerseite, Notfallseite, PWA-Manifest mit iOS-Startbildern,
Startanimation.

---

## 6. Zustand der Datenbank

25 Migrationen, **einzeln von Hand im Supabase-SQL-Editor eingespielt**.
Es gibt keine Migrationsverwaltung — `check_schema.sql` ist der Ersatz
dafür und sagt, was tatsächlich in der Datenbank steht.

Die jüngsten fünf sind die wichtigsten:

| Nr | Was |
|---|---|
| 0021 | Profil des Klienten: Geburtsdatum, Bild, Spaltenschutz-Trigger |
| 0022 | Härtung: View mit `security_invoker`, keine Selbstregistrierung als Trainer, `promote_to_coach()` |
| 0023 | Korrektur zu 0022: Rollenname `athlete` statt `client` |
| 0024 | Einladung: Adresse kommt vom Trainer, kein stilles Scheitern, `unlink_client()` |
| 0025 | Korrektur zu 0021: Der Trigger nahm jede angenommene Einladung zurück |

**Onboarding eines Trainers** (es gibt bewusst keine Oberfläche dafür):

1. Supabase → *Authentication → Users → Add user → Send invitation*
2. SQL-Editor: `select promote_to_coach('adresse@example.com', 'Vor Nachname');`
3. Prüfen: Rolle `coach` **und** `hat_trainersatz = true`

**Einen Zugang wieder lösen:** `unlink_client(client_id)` oder der Knopf
*Zugang trennen* in der Klientenakte. Die Historie bleibt.

---

## 7. Die drei Fehlerklassen dieses Projekts

Alle drei großen Fehler der letzten Wochen hatten dieselbe Form: **Eine
Sicherung, die im Fehlerfall schweigt statt abzubrechen.** Wer hier
weiterbaut, sollte sie kennen — sie entstehen nicht aus Nachlässigkeit,
sondern weil der gute Fall richtig behandelt wird und der schlechte gar
nicht.

**(a) Die stille `where`-Bedingung.**
`update clients set profile_id = … where id = … and profile_id is null`
— trifft die Bedingung nicht zu, ändert Postgres null Zeilen und meldet
Erfolg. Gegenmittel: nach dem Schreiben zurücklesen und prüfen, ob es
gewirkt hat. So macht es `accept_client_invite` seit 0025.

**(b) Der zurücksetzende Trigger.**
`guard_client_self_edit` setzte Spalten auf ihre alten Werte zurück,
statt abzulehnen. Dadurch nahm er jede angenommene Einladung
stillschweigend wieder zurück. Gegenmittel: Die Regel präziser
formulieren, statt eine Ausnahme einzubauen — erlaubt ist, eine Zeile
**ohne Besitzer** für **sich selbst** zu beanspruchen.

**(c) Der blinde Prüfer.**
`check-actions.mjs` und `check-layout.mjs` meldeten in ihrer ersten
Fassung Entwarnung, obwohl sie den Fehler nicht sehen konnten, für den
sie gebaut wurden. Gegenmittel: Jeder Prüfer hat eine Selbstprüfung mit
Code 2, und jeder wird einmal gegen den wieder eingebauten Fehler
getestet.

**Die Regel, die daraus folgt:** Eine Prüfung, die nicht laufen kann,
darf nicht aussehen wie eine bestandene Prüfung.

---

## 8. Joëls Test vom 01.10. — ungefiltert

**Was sitzt:** Anmeldung und Passwort-Strecke „alles top". Tracking
„bockt", Timer, „super einfach und direkt bedienbar". Fortschritt beim
Athleten „supercool". Zwei Pläne nebeneinander „find ich geil".
Athleten-Startseite „übersichtlich, super simple".

**Das Muster:** Alles, was *im Training* passiert, funktioniert. Die
gesamte Kritik hängt an der *Vorbereitung* — Klient anlegen, Ziele, Plan
bauen.

**Offene Punkte, in seiner Reihenfolge:**

| # | Was | Einschätzung |
|---|---|---|
| 1 | Beim Klient anlegen direkt Maße erfassen, daraus Goal Setting (Fat Loss, Kaloriendefizit) | Neuer Produktbereich, nicht ein Feld |
| 2 | Plan-Einstieg zu klein und zu spät — sollte direkt nach dem Anlegen kommen | Führung nach dem Anlegen, ein halber Tag |
| 3 | Name des Trainingstages doppelt, „genauso bei der Slot-Erstellung" | **Unklar — Joël zeigen lassen** |
| 4 | Nach Tag-Anlegen direkt Übungsauswahl: Suche, „zuletzt benutzt", Reiter nach Muskelgruppe und Bewegung | Größter Umbau am Plan-Editor. Heute wählt man erst ein Muster, dann eine Übung — Joël denkt in Übungen |
| 5 | Statt „Hinweise" zwei Auswahlfelder: **Attachment** und **Grip** | Klar umsetzbar, braucht die vollständigen Listen von Joël |
| 6 | Tracking zeigt „erste Leistung in dieser Übung", obwohl es andere Hinweise gäbe | **Vermutlich ein Fehler, kein Wunsch.** `beatsBest` liefert das, wenn keine Vormarke existiert |
| 7 | Kalender: bei zwei Terminen unterschiedliche Zeiten wählbar | Kleine Erweiterung |
| 8 | Kalender mit Google/Apple verknüpfen | Eigenes Projekt: OAuth, Synchronisation, Konflikte |
| 9 | Videos in der Übungsbibliothek | Offene Frage: wer produziert sie |
| 10 | „Sind eigene Übungen plattformübergreifend sichtbar?" | **Nein.** `coach_id is null` = global, sonst privat. Produktentscheidung, gehört beantwortet |
| 11 | Check-in braucht vielleicht keinen eigenen Reiter beim Athleten | |
| 12 | Coach-Mobil: Klientenansicht in drei Tab-Gruppen — Tracken, Check-ins, Progress | Nachtrag 06.10. |
| 13 | **Launch in den Niederlanden → App muss auf Englisch** | Nachtrag 06.10. Siehe unten |

### Punkt 13 ist die Weggabelung

Jeder Text in der App ist Deutsch: Oberfläche, Fehlermeldungen,
Einwilligungstext, Datums- und Zahlenformate, sämtliche Dokumente in
diesem Ordner. Das ist kein Übersetzungsauftrag, sondern ein Umbau —
Texte raus aus den Dateien, Sprachdatei rein, überall durchziehen.

**Der Zeitpunkt entscheidet über die Kosten.** Jetzt betrifft es den
Bestand. Nach den Punkten 1 bis 12 betrifft es den Bestand plus alles
Neue, und jeder neue Bildschirm wird zweimal gebaut.

**Entschieden am 07.10.2026:** Der NL-Launch kommt. Die Oberfläche ist
Englisch (Standard) und Deutsch (wählbar), mit europäischen Formaten.
Code, Kommentare und Dokumente bleiben Deutsch.

**Umgesetzt am 07.10.2026:** Jeder sichtbare Text steht in
`app/i18n/de` und `app/i18n/en`; `check-texte.mjs` steht auf null und
schlägt bei jedem neuen Text im Code an. Sprachwahl auf der
Anmeldeseite, in der Kopfzeile des Trainers und im Profil des Athleten.
Die Engine liefert nur noch Zahlen (`Insight.facts`, `unit`), die Sätze
baut die App. Meldungen aus Postgres übersetzt `i18n/db-fehler.ts`.

**Noch Deutsch, weil es Inhalt ist und nicht Oberfläche:**

- **Die globale Übungsbibliothek** (Name, Aufbau, Hinweis, typischer
  Fehler) liegt deutsch in der Datenbank. Braucht eine Migration mit
  englischen Spalten — und Joëls fachlichen Blick auf die Übersetzung.
- **Mailvorlagen in Supabase** (Einladung, Passwort) — im Dashboard,
  nicht im Code.
- **Was Nutzer selbst eintippen** (Plan- und Tagesnamen, Notizen,
  eigene Übungen) bleibt in der Sprache, in der es geschrieben wurde.
  Die Vorlagen im Plan-Dialog legen Tagesnamen in der Sprache dessen an,
  der den Plan anlegt.
- **Der Einwilligungstext** steht jetzt in beiden Sprachen
  (`i18n/einwilligung.ts`) — beide ungeprüft, siehe Abschnitt 9. Die
  Fassung trägt die Sprache (`v1-de`, `v1-en`); ältere Einwilligungen
  mit `v1` sind die deutsche Fassung.

**Erledigt seit dem Test:** Punkt 6 (nur noch der erste Satz ist die
„erste Leistung", `markBefore`), Punkt 2 (nach dem Anlegen direkt in
die Akte mit offenem Plan-Dialog), Punkt 13 (Klientenakte in drei
Reitern Tracken / Check-ins / Progress plus Stammdaten, über `?tab=`;
Zuordnung der Abschnitte in `sections.ts`), Punkt 11 (Check-in nicht
mehr in der Athleten-Leiste, sondern über „Heute").

**Trainer-Leiste seitdem:** Feed · Klienten · Kalender · Übungen ·
Profil. Sprache und Abmelden stehen im Profil. Die Sammelseiten
`/coach/track` und `/coach/checkins` gibt es weiter, nur ohne eigenen
Punkt: erreichbar über die Akte, den Feed und die Homescreen-Verknüpfung.

**Seit dem 07.10. außerdem:**

- Punkt 4: Übungsauswahl im Plan-Editor in zwei Schritten — erst die
  Übung (Suche, „Zuletzt benutzt", Filter nach Muskelgruppe und
  Bewegung), dann Sätze und Vorgaben. Nach dem Anlegen eines Tages
  öffnet sie direkt.
- Punkt 5: Joël reicht Freitext. Der Platzhalter im Slot-Hinweis nennt
  jetzt Griff und Aufsatz.
- „Übungen" heißt „Training", mit Reitern Übungen und **Programme**
  (Pläne ohne Klienten, Tabelle `templates`): eigene anlegen, App-
  Vorlagen kopieren, an Klienten zuweisen.
- Feedback-Feld im Profil (Trainer und Athlet) für den Test.
- Einstellung „Ansicht" in der Akte entfernt; Monatskalender schmaler.

**Einzuspielen, in dieser Reihenfolge:** 0026 (Übungen englisch),
0027 (Feedback), 0028 (Programme). Die App läuft auch vorher — ohne
0026 bleiben die Übungen deutsch, ohne 0027 meldet das Feedback-Feld,
dass die Migration fehlt, ohne 0028 gibt es keine App-Vorlagen und
kein Zuweisen.

**Feedback lesen** im SQL-Editor:
`select f.created_at, p.full_name, f.role, f.message from app_feedback f
left join profiles p on p.id = f.user_id order by f.created_at desc;`

**Offen von Joël:** Punkt 3 zeigen; die drei App-Vorlagen und die
englischen Übungstexte fachlich durchsehen.

---

## 9. Was offen ist, unabhängig von Joël

**Rechtlich — blockiert echte Klienten, nicht den Test:**

- Impressum fehlt. Für ein gewerbliches Angebot Pflicht.
- Datenschutzerklärung fehlt.
- Der Einwilligungstext für die Fotos
  (`app/i18n/einwilligung.ts`, deutsch und englisch) ist **von mir,
  nicht von einem Anwalt**. Der Anwalt muss beide Fassungen sehen. Drei Lücken, die ein Anwalt füllen muss: Wer ist
  Verantwortlicher (die BV gibt es noch nicht)? Welche Löschfrist nach
  Betreuungsende? Wo liegen die Daten körperlich?

**Solange das offen ist: Testdaten, keine echten Klienten.** Sobald
jemand Körperfotos eines echten Klienten hochlädt, liegen besondere
Kategorien nach Art. 9 DSGVO in der Datenbank.

**Technisch:**

- Sicherungen: Im kleinen Supabase-Tarif einmal nachsehen, was
  eingestellt ist.
- Die Einladungsvorlage in Supabase zeigt auf die Site URL statt auf
  `/auth/callback`. Ein eingeladener Trainer landet deshalb ohne
  Passwort auf der Anmeldeseite. Behelf: „Passwort vergessen". Richtige
  Lösung: In der Vorlage *Invite user* den Link ersetzen durch
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/passwort/neu`
- Ladezustände fehlen für fünf Routen, leere Zustände ohne nächste
  Handlung, Abstandsraster.

**Zurückgestellt:** Ketten-QA-Dashboard und `org_admin` · Zahlungen über
Mollie · Chat · Messanleitungen für die Körpermaße (die würde ich vor
dem ersten echten Klienten machen — wer jede Woche anders misst, dessen
Kurve ist Rauschen).

**Seit Wochen angefragt und nie geliefert:** die Kleinigkeiten aus dem
Meeting vom 19.06. Sie stehen in keinem Dokument in diesem Ordner.

---

## 10. Die anderen Dokumente

| Datei | Inhalt |
|---|---|
| `VOR-DER-BETA.md` | Prüfliste vor der Freigabe: 8 SQL-Blöcke, 9 Wege durch die App |
| `TESTLAUF.md` | Vollständiger Durchgang, 17 Abschnitte |
| `GO-LIVE.md` | Der Weg nach draußen, vier Blöcke — weitgehend abgearbeitet |
| `RESEND-EINRICHTEN.md` | Mailversand, Schritt für Schritt |
| `BACKLOG.md` | Was offen ist, gegen den Code geprüft |
| `STAND.md` | Älterer Stand vom 23.09., teilweise überholt |
| `KOERPERGEWICHT-Faktoren.md` | Körpergewichtsanteile je Übung — fachlich von Joël |
| `MUSKELGRUPPEN-Zuordnung.md` | Zuordnungsliste, fachlich von Joël |

---

## 11. Wenn du hier weiterbaust

1. **`bash pruefen.sh` vor jedem Commit.** Zehn müssen grün sein.
2. **Jede neue Tabelle bekommt eine RLS-Regel**, sonst ist sie offen.
3. **Jeder Spaltenschutz braucht einen Trigger**, RLS reicht nicht.
4. **Nach jedem schreibenden Vorgang in der Datenbank zurücklesen**, ob
   er gewirkt hat — und bei Misserfolg abbrechen, nicht schweigen.
5. **Migrationen sind durchnummeriert und werden von Hand eingespielt.**
   Neue Nummer, nie eine bestehende ändern, außer die Änderung ist
   dokumentiert (wie in 0022).
6. **`check_schema.sql` erweitern**, wenn du eine Migration schreibst.
   Sonst merkt niemand, dass sie fehlt.
7. **Texte gehören ins Wörterbuch** (`app/i18n/de`, `app/i18n/en`).
   Code, Kommentare und Dokumente bleiben Deutsch.
8. Kommentare im Code erklären **warum**, nicht was. Das ist hier
   durchgängig so und sollte so bleiben: Die meisten Fallen in diesem
   Projekt sind nicht am Code ablesbar.
