# Go-live

Stand: 24. September 2026.

Vom Laptop zur Adresse, die Joel aufrufen kann. Acht Schritte in vier
Blöcken, dazwischen jeweils ein Punkt, an dem man aufhören und testen
kann.

Deine Reihenfolge aus dem Chat war fast richtig. Zwei Sachen liegen
anders, als sie klingen — die stehen gleich hier oben, weil sie die
Planung ändern.

---

## Zwei Dinge vorweg

### SMTP ist kein Feinschliff, sondern der Anfang

Du hattest recht mit der Vermutung, und es ist ernster als „brauchen wir
auch noch". Supabases eingebauter Mailversand **liefert überhaupt nur an
Adressen, die zum Projekt-Team gehören** — und selbst dann mit etwa
zwei Mails pro Stunde, ausdrücklich ohne Zusage. Ohne eigenen Versand
bekommt Joel also **keine** Einladung, **keine** Passwort-Mail und
**keine** Bestätigung beim E-Mail-Wechsel.

Das heißt: Resend kommt nicht nach dem Ausrollen, sondern davor. Sonst
rollst du etwas aus, das du nicht testen kannst.

Resend passt: 100 Mails am Tag beziehungsweise 3.000 im Monat kostenlos,
SMTP-Relay in allen Tarifen, EU-Region verfügbar — letzteres ist für die
DSGVO-Runde relevant, nicht nur nett.

### Eine Super-Admin-Maske brauchst du (noch) nicht

Für zwei Trainer ist eine eigene Oberfläche Arbeit, die niemand
benutzt. Das Supabase-Dashboard kann alles, was du in der Beta brauchst:
Nutzer sehen, Passwort-Reset auslösen, Konten sperren.

Was gefehlt hat, war der eine Handgriff „mach diesen Zugang zum
Trainer", weil dafür zwei Tabellen zusammenpassen müssen. Den gibt es
jetzt als Funktion (Migration 0022):

```sql
select promote_to_coach('joel@example.com', 'Joel Hogenkamp');
```

**Wann sich das ändert:** Sobald Trainmore im Spiel ist. Dann brauchst
du die Rolle `org_admin`, eine Einrichtungsverwaltung und das
QA-Dashboard — und das ist die Verkaufsgeschichte, kein
Verwaltungswerkzeug. Zwei verschiedene Bauaufträge; der zweite lohnt
sich erst, wenn der erste Kunde da ist.

---

## Block 1 — Türen schließen (halber Tag)

Vor allem anderen, weil danach eine öffentliche Adresse entsteht.

### 1.1 Migration 0022 einspielen — **erledigt**, aber 0023 fehlt noch

**0023 ist ein Nachtrag zu meinem Fehler in 0022.** Dort stand als neue
Standardrolle `'client'`. Die Aufzählung `user_role` kennt diesen Wert
nicht — der Klient heißt in dieser Datenbank `'athlete'`; `clients` ist
der Name der *Tabelle*. Seit 0022 eingespielt ist, scheitert **jede**
Registrierung, auch die des Athleten über den Einladungslink. Sichtbar
ist davon nur, dass der Link nicht funktioniert.

Warum es beim Einspielen nicht auffiel: `create function` prüft den
Rumpf einer plpgsql-Funktion nicht. Die Migration meldete Erfolg.

`0023_rollenname_korrigieren.sql` im SQL-Editor ausführen. Danach
einmal zur Kontrolle:

```sql
select enum_range(null::user_role);
```

Muss `{coach,athlete,org_admin}` ausgeben.

Gegen den Rückfall gibt es jetzt `supabase/check_enums.py` — die Prüfung
vergleicht jeden Rollen-Namen in SQL und im Code gegen die tatsächlichen
Werte der Aufzählung.



Schließt zwei Löcher, die auf dem Laptop egal waren:

**Jeder konnte sich als Trainer registrieren.** Das Anmeldeformular hat
einen Registrieren-Modus, und `handle_new_user` nahm bisher `coach` als
Standardrolle — aus Metadaten, die der Browser mitschickt. Wer die
Adresse findet, legt sich ein Trainerkonto an. Fremde Daten sähe er
nicht, dafür sorgt die Zeilensicherheit, aber er wäre drin. Neuer
Standard ist `client`; ein Trainerkonto entsteht nur noch über den
Dienstschlüssel oder von Hand.

**Die Waisen-Abfrage las an der Zeilensicherheit vorbei.** `verwaiste_fotos`
aus 0020 ist eine Sicht auf `storage.objects`, und eine Sicht läuft in
Postgres mit den Rechten ihres Eigentümers. Supabase vergibt zusätzlich
ein Leserecht auf alles im Schema `public`. Zusammen: Jeder angemeldete
Nutzer hätte die Dateipfade aller verwaisten Körperfotos lesen können,
und die Pfade beginnen mit der client_id. Jetzt `security_invoker` plus
Entzug der Leserechte.

### 1.2 Registrieren-Modus aus dem Anmeldeformular nehmen — **erledigt**

Die Funktion oben verhindert das Trainerkonto; das Formular bietet sie
trotzdem weiter an. Ein Knopf, der nichts mehr tut, ist eine
Fehlermeldung mit Anlauf. Raus damit — in der Beta kommen Athleten über
den Einladungslink und Trainer über den SQL-Editor.

### 1.3 In Supabase: E-Mail-Bestätigung an, Weiterleitungsadressen eintragen

Ohne Bestätigung kann sich jemand mit einer fremden Adresse anmelden.
Und die erlaubten Weiterleitungsadressen (`Redirect URLs`) müssen die
neue Domain enthalten, sonst laufen alle Links aus Mails ins Leere.

**Dabei gleich die Region prüfen.** Liegt das Projekt nicht in der EU,
ist das ein eigenes Kapitel für die Anwaltsrunde (Art. 44 ff.). Einmal
nachsehen, bevor jemand danach fragt.

---

## Block 2 — Mailversand (halber Tag)

### 2.1 Resend einrichten

Konto anlegen, Domain verifizieren (DKIM/SPF-Einträge beim
Domain-Anbieter), **EU-Region wählen**. Danach SMTP-Zugangsdaten in
Supabase unter *Authentication → SMTP Settings* eintragen.

Resend hat eine eigene Anleitung genau für Supabase — die ist aktueller
als alles, was ich hier aufschreiben könnte.

### 2.2 Mailtexte auf Deutsch

Die Standardtexte von Supabase sind englisch und tragen deren Namen.
Einladung, Passwort zurücksetzen, E-Mail bestätigen — drei Vorlagen,
eine halbe Stunde. Dass die erste Mail, die ein Klient von euch sieht,
auf Englisch „Confirm your signup" sagt, ist ein vermeidbarer erster
Eindruck.

### 2.3 Prüfen, dass es ankommt

An eine Adresse schicken, die **nicht** im Supabase-Team ist. Das ist
der eigentliche Test — mit einer Team-Adresse funktioniert auch der
eingebaute Versand, und dann glaubst du, es liefe.

---

## Block 3 — Was in der Beta fehlt (ein Tag)

### 3.1 Passwort vergessen — **erledigt**

Drei Teile, alle gebaut:

| Adresse | Was dort passiert |
|---|---|
| `/auth/passwort` | fragt nach der E-Mail und schickt den Link |
| `/auth/callback` | nimmt den Link aus der Mail entgegen, setzt die Sitzung |
| `/auth/passwort/neu` | neues Passwort, zweimal eingetippt |

Dazu im Anmeldeformular der Link „Passwort vergessen?".

**Was in Supabase dafür stimmen muss** (Schritt 8 der Resend-Anleitung):
Unter *Authentication → URL Configuration* müssen die Adressen, von
denen aus angefordert wird, in den **Redirect URLs** stehen — beim
lokalen Testen `http://localhost:3000/**`, später die Domain. Steht sie
dort nicht, ersetzt Supabase sie still durch die *Site URL*, und der
Link aus der Mail landet auf der Startseite statt auf dem Formular.

**Ein Verhalten, das kein Fehler ist:** Wer den Link auf einem anderen
Gerät öffnet, als er ihn angefordert hat, kommt nicht durch. Beim
Anfordern legt der Browser einen Gegenschlüssel ab, und der bleibt dort.
Die Seite sagt das jetzt in Worten statt „invalid request" — aber es
bleibt so. Im Testlauf also Mail auf demselben Gerät öffnen.

### 3.2 Fehlerseite und 404

Es gibt beide nicht. Bricht eine Abfrage weg, zeigt Next im Betrieb eine
leere weiße Seite — und du bekommst als Rückmeldung „die App ist kaputt"
ohne jeden Hinweis worauf. Zwei Stunden, und man merkt es erst, wenn es
fehlt.

### 3.3 Datenschutzerklärung und Impressum

Das Impressum ist keine Kür: Für ein gewerbliches Angebot ist es
Pflicht, und es fällt sofort auf. Die Datenschutzerklärung kommt aus der
Anwaltsrunde — zusammen mit dem Einwilligungstext für die Fotos, der in
`app/athlete/photos/consent-text.ts` steht und **von mir ist, nicht von
einem Anwalt**.

Drei Lücken, die er füllen muss und die ich benennen kann:

- **Wer ist der Verantwortliche?** Die BV gibt es noch nicht. Heute wäre
  es die NINOY GmbH oder Joel persönlich — mit Namen und Anschrift.
- **Löschfrist**, wenn die Betreuung endet. Heute bleiben Daten und
  Fotos, bis jemand widerruft.
- **Wo liegen die Daten körperlich** (siehe 1.3).

---

## Block 4 — Ausrollen (halber Tag)

### 4.1 Den Bau auf einem echten Rechner

**Der Befehl ist `pnpm build` im Wurzelverzeichnis**, nicht `npx next
build`. Zwei Gründe, und beide habe ich beim ersten Anlauf selbst falsch
aufgeschrieben:

- Im Wurzelverzeichnis gibt es kein `app`-Verzeichnis — das liegt in
  `apps/coach`. `next build` sucht es neben sich und bricht mit
  „Couldn't find any `pages` or `app` directory" ab.
- `npx` lädt sich, wenn es kein lokales `next` findet, die **neueste**
  Fassung aus dem Netz. Gebaut würde dann mit Next 16, obwohl das
  Projekt auf 14.2.15 festgelegt ist. Der Bau, der dabei herauskommt,
  sagt nichts über den, den Vercel macht.

`pnpm build` geht über Turborepo, das baut im richtigen Verzeichnis mit
der festgelegten Fassung.


**Vor Vercel, nicht dort.** Der Bau läuft in meiner Umgebung nicht
(node_modules für macOS gebaut), also ist er seit Wochen nicht
durchgelaufen. Ein Fehler, der hier auftaucht, kostet fünf Minuten; auf
Vercel kostet er eine Runde Suchen in fremden Protokollen.

Vorher einmal alle acht Prüfungen:

```
npx tsc -p apps/coach/tsconfig.json --noEmit
node apps/coach/check-format.mjs
node apps/coach/check-layout.mjs
node apps/coach/check-actions.mjs
node apps/coach/check-scale.mjs
python3 supabase/check_sql.py
python3 supabase/check_enums.py
bash packages/coach-engine/run-tests.sh
bash apps/coach/run-tests.sh
```

### 4.2 Vercel

Repository verbinden, Wurzelverzeichnis auf `apps/coach`, drei
Umgebungsvariablen setzen:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL      → die neue Domain, nicht mehr 172.20.10.2
```

Der Dienstschlüssel (`service_role`) gehört **nicht** dorthin, solange
ihn keine Server-Funktion braucht. Er hebelt jede Zeilensicherheit aus.

### 4.3 Domain

Danach fällt die IP-Sucherei weg, die im Testlauf drei Fußnoten kostet —
und das Homescreen-Symbol zeigt nicht mehr ins Leere, sobald du das Netz
wechselst.

### 4.4 `check_schema.sql` gegen die Produktionsdatenbank

Alle Migrationen 0007–0022 auf OK. Das ist der Moment, in dem auffällt,
ob eine davon nie eingespielt wurde.

---

## Danach: testen

`TESTLAUF.md`, sechzehn Abschnitte. Einmal komplett mit dir als Trainer
und Joel als Athlet — und danach einmal andersherum, damit Joel die
Trainerseite aus eigener Hand kennt.

Erst dann der erste echte Klient.

---

## Was ich NICHT in diesen Plan geschrieben habe

Damit klar ist, dass es nicht vergessen wurde:

- **Ketten-QA-Dashboard und `org_admin`** — die Verkaufsgeschichte
  Richtung Trainmore. Für einen Test mit Joels Klienten irrelevant.
- **Zahlungen über Mollie** — in der Beta zahlt niemand.
- **Anleitungen zu den Körpermaßen** und **Ziele mit Zielwerten** —
  beides aus Joels Meetings, beides hält keinen Test auf. Die
  Messanleitungen würde ich trotzdem vor dem ersten echten Klienten
  machen: Wer jede Woche anders misst, dessen Kurve ist Rauschen.
- **Abstandsraster, Ladezustände für fünf Seiten, leere Zustände** —
  Feinschliff aus der letzten Runde, ein halber Tag, jederzeit
  nachholbar.
- **Sicherungen** — Supabase legt auf den kleinen Tarifen nur begrenzt
  welche an. Vor dem ersten echten Klienten einmal nachsehen, was
  eingestellt ist. Bis dahin sind die Daten ersetzbar; danach nicht.

---

## Und das hier fehlt mir weiterhin

**Die Kleinigkeiten aus dem Meeting 19.06.** Du führst sie seit dem
16.09 auf deiner Liste, aber sie stehen in keinem Dokument in diesem
Ordner und ich habe sie nie gesehen. Wenn sie vor dem Go-live gehören,
schick sie mir — sonst gehen sie genau dort unter.

---

## Zusammengefasst

| Block | Inhalt | Aufwand |
|---|---|---|
| 1 | ~~Migration 0022~~, **0023 offen**, ~~Registrieren raus~~, Supabase-Einstellungen | ½ Tag |
| 2 | ~~Resend~~, Mailtexte, Versand prüfen | ½ Tag |
| 3 | ~~Passwort vergessen~~, Fehlerseite, Impressum + Datenschutz | 1 Tag + Anwalt |
| 4 | `next build`, Vercel, Domain, Schema-Check | ½ Tag |

**Zweieinhalb Arbeitstage plus die Anwaltsrunde.** Die Anwaltsrunde
läuft parallel — sie blockiert nur den ersten echten Klienten, nicht das
Ausrollen und nicht euren eigenen Testlauf.
