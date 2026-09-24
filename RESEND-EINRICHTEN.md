# Mailversand über Resend einrichten

Stand: 24. September 2026. Block 2 aus `GO-LIVE.md`.

Ziel: Einladungen, Passwort-Mails und Bestätigungen kommen von **eurer**
Adresse an, bei **jedem** Empfänger.

Heute kommen sie bei niemandem an, der nicht im Supabase-Team ist — das
ist keine Einstellung, sondern eine Sperre des eingebauten Versands.
Solange die gilt, kann Joel nicht einmal sein Passwort zurücksetzen.

Etwa 45 Minuten, plus Wartezeit auf die DNS-Einträge.

---

## Schritt 0 — Entscheide, von welcher Adresse ihr schreibt

Das musst du vorher wissen, sonst machst du Schritt 2 zweimal.

Resend verschickt **nur von einer Domain, die dir gehört und die du
verifiziert hast**. Eine fremde Adresse geht nicht, und die
Wegwerfadresse `onboarding@resend.dev` schickt nur an dich selbst.

Zwei Wege:

**A — die PTHREE-Domain**, sobald ihr sie habt. Absender dann etwa
`hallo@pthree.app`.

**B — eine Subdomain von `ninoy.de`**, wenn die PTHREE-Domain noch nicht
steht. Also `mail.ninoy.de`, Absender `pthree@mail.ninoy.de`.

**Nimm in beiden Fällen eine Subdomain, nicht die nackte Domain.**
`mail.pthree.app` statt `pthree.app`. Grund: Der Ruf einer Absender-Domain
hängt daran, was von ihr verschickt wurde. Wenn eine Beta-App mal
hundert Mails an tote Adressen schickt, soll das nicht auf die Domain
durchschlagen, über die du deine Geschäftspost führst.

Du brauchst Zugang zu den DNS-Einträgen dieser Domain. Falls die bei
einem Anbieter liegen, an den du nicht herankommst: Das ist der erste
Blocker, nicht der letzte.

---

## Schritt 1 — Konto anlegen

1. `resend.com` → **Get started**, Konto mit deiner Geschäftsadresse.
2. Bestätigungsmail anklicken.

Kostenlos sind **100 Mails am Tag** beziehungsweise 3.000 im Monat, mit
SMTP-Relay. Für eine Beta mit zwei Trainern ist das eine Größenordnung
zu viel, nicht zu wenig.

---

## Schritt 2 — Domain verifizieren

1. Im Resend-Dashboard **Domains → Add Domain**.
2. Den Namen aus Schritt 0 eintragen, z. B. `mail.pthree.app`.
3. **Region: Europe (EU)** wählen.

   Kein Detail: Damit liegen die Mail-Daten in der EU, und das ist
   genau die Frage, die in der Anwaltsrunde zur Datenschutzerklärung
   kommt. Die Region gehört zur Domain — prüf im Zweifel bei Resend
   nach, ob sie sich später noch ändern lässt, bevor du es falsch
   festlegst.

4. Resend zeigt dir jetzt **DNS-Einträge** an: ein paar `TXT` und
   `MX`. Die trägst du bei deinem Domain-Anbieter ein — unverändert,
   inklusive der langen Zeichenketten.

   Achte darauf, ob dein Anbieter den Domainnamen automatisch anhängt.
   Manche wollen nur `resend._domainkey`, andere die vollständige Form
   `resend._domainkey.mail.pthree.app`. Doppelt eingetragen sieht das
   dann so aus: `resend._domainkey.mail.pthree.app.mail.pthree.app` —
   und nichts funktioniert.

5. Zurück bei Resend auf **Verify** klicken.

**Woran du merkst, dass es geklappt hat:** Die Domain steht auf
*Verified*, grün. Das dauert je nach Anbieter Minuten bis Stunden. Warte
es ab, bevor du weitermachst — ohne verifizierte Domain schlägt jeder
weitere Schritt fehl, und du suchst den Fehler an der falschen Stelle.

**Noch ein Eintrag, den Resend nicht verlangt:** Ein DMARC-Eintrag
(`_dmarc`, Wert `v=DMARC1; p=none; rua=mailto:dein@postfach`). Ohne ihn
landen Mails bei Gmail und Outlook häufiger im Spam. `p=none` heißt:
nur beobachten, nichts blockieren — das ist der richtige Anfang.

---

## Schritt 3 — API-Schlüssel erzeugen

1. **API Keys → Create API Key**.
2. Name: `supabase-smtp`. Permission: **Sending access** genügt.
3. Den Schlüssel **sofort kopieren.** Er wird genau einmal angezeigt.

Er ist das Passwort für den Versand. Nicht in den Code, nicht in eine
Chat-Nachricht — direkt weiter zu Schritt 4.

---

## Schritt 4 — In Supabase eintragen

**Eine fertige „Resend-Integration" gibt es nicht.** Ein Blogeintrag von
Resend aus 2023 erwähnt eine; in der heutigen Dokumentation steht sie
nicht mehr. Ich hatte sie in der ersten Fassung dieser Anleitung
drin — such nicht weiter, es sind vier Felder von Hand.

### Die Zugangsdaten holen

Bei Resend unter **Settings → SMTP** stehen sie zum Kopieren:

| Feld | Wert |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` — genau das Wort, kein Name und keine Adresse |
| Password | der API-Schlüssel aus Schritt 3 |

Port 465 ist ab der ersten Sekunde verschlüsselt. 587 geht auch, baut
die Verschlüsselung aber erst nach dem Verbindungsaufbau auf. Nimm 465,
solange nichts dagegen spricht.

### In Supabase eintragen

Der Weg im Dashboard hat sich geändert. **Nicht** über die
Projekteinstellungen, sondern:

1. **Authentication** in der linken Leiste
2. darunter, im Abschnitt **Notifications**, auf **Emails**
3. dort der Reiter **SMTP Settings**
4. **Enable Custom SMTP** einschalten

Dann zuerst die beiden Pflichtfelder:

| Feld | Wert |
|---|---|
| Sender email | `pthree@mail.pthree.app` — muss auf der Domain aus Schritt 2 liegen |
| Sender name | `PTHREE` |

Darunter Host, Port, Username und Password von oben. **Save.**

**Sender email ist die Stelle, an der es klemmt.** Steht dort eine
Adresse auf einer nicht verifizierten Domain, lehnt Resend jede Mail ab
— und in Supabase siehst du nur, dass nichts ankommt.

---

## Schritt 5 — Das Limit hochsetzen

Supabase hat ein **eigenes** Limit, unabhängig von Resend: etwa 30
Mails pro Stunde bei neuen Projekten. Das bleibt bestehen, auch wenn
dein Versand tausende könnte.

**Authentication → Rate Limits →** „Rate limit for sending emails" auf
einen Wert setzen, der zur Beta passt. 100 pro Stunde ist reichlich und
schützt trotzdem vor einem Fehler, der in einer Schleife Mails
verschickt.

---

## Schritt 6 — Die Texte auf Deutsch

**Authentication → Email Templates.** Vier Vorlagen betreffen euch:

- **Confirm signup** — die erste Mail, die ein Klient je von euch sieht
- **Invite user**
- **Reset password**
- **Change email address** — die aus dem Profil des Athleten

Alle sind englisch und tragen Supabase-Formulierungen. Dass eure erste
Mail „Confirm your signup" sagt, ist ein vermeidbarer erster Eindruck.

Die Platzhalter wie `{{ .ConfirmationURL }}` **unverändert
übernehmen** — die füllt Supabase.

Ein brauchbarer Anfang für *Reset password*:

```
Betreff: Neues Passwort für PTHREE

Hallo,

du hast ein neues Passwort für PTHREE angefordert.

<a href="{{ .ConfirmationURL }}">Neues Passwort festlegen</a>

Der Link gilt eine Stunde. Wenn du das nicht warst, kannst du diese
Mail ignorieren — es ändert sich nichts.

PTHREE
```

---

## Schritt 7 — Prüfen, und zwar richtig

**Das ist der Schritt, den man falsch macht.**

Schick die Testmail an eine Adresse, die **nicht** im Supabase-Team ist
und **nicht** dein Resend-Konto. Eine private Adresse von Joel, oder
deine GMX-Adresse.

Mit einer Team-Adresse funktioniert auch der alte eingebaute Versand.
Du würdest also prüfen, dass etwas läuft, das du gerade ersetzt hast,
und es erst bei Joel merken.

**So testest du:**

1. In Supabase unter **Authentication → Users** einen Nutzer mit der
   fremden Adresse anlegen, Haken bei *Auto Confirm User* weglassen.
2. Die Mail muss innerhalb einer Minute da sein — mit **eurem**
   Absender, nicht `noreply@mail.app.supabase.io`.
3. In Resend unter **Emails** steht sie mit Status *Delivered*.

**Wenn nichts ankommt**, schau in dieser Reihenfolge:

- Resend → **Emails**: Steht die Mail da? Wenn nein, kam sie gar nicht
  erst an — dann stimmen Host, Benutzername oder Schlüssel nicht.
- Steht sie da mit *Bounced*: Die Empfängeradresse gibt es nicht.
- Steht sie da mit *Delivered*, ist aber nicht im Postfach: Spam-Ordner.
  Dann fehlt vermutlich der DMARC-Eintrag aus Schritt 2.
- Gar keine Mail und nichts in Resend: In Supabase unter **Logs →
  Auth** steht der SMTP-Fehler im Klartext.

---

## Schritt 8 — Weiterleitungsadressen eintragen

Gehört formal zu Block 1, fällt aber erst hier auf: Die Links in den
Mails führen zurück in die App, und Supabase lässt nur Adressen zu, die
eingetragen sind.

**Authentication → URL Configuration:**

- **Site URL**: die spätere Domain der App
- **Redirect URLs**: dieselbe plus `/**`, und solange du lokal testest
  auch `http://localhost:3000/**`

Ohne das führt der Passwort-Link ins Leere, und zwar mit einer Meldung,
die nicht sagt warum.

---

## Danach

Die Seite **„Passwort vergessen"** gibt es jetzt: `/auth/passwort`,
verlinkt im Anmeldeformular. Der ganze Weg lässt sich also aus der App
heraus testen — Adresse eintragen, Mail öffnen, neues Passwort setzen.

Zwei Dinge, die dabei schiefgehen können und nicht an Resend liegen:

- **Der Link landet auf der Startseite statt auf dem Formular.** Dann
  fehlt die Adresse unter *Redirect URLs* (Schritt 8). Supabase ersetzt
  sie dann still durch die *Site URL*.
- **„Der Link wurde in einem anderen Browser geöffnet."** Stimmt genau
  so. Der Gegenschlüssel bleibt beim Anfordern im Browser liegen. Mail
  also auf demselben Gerät öffnen — das gilt auch für Joel im Testlauf.

Und die Migration `0023_rollenname_korrigieren.sql` gehört noch in die
Datenbank, bevor du irgendjemanden anlegst. Warum, steht in
`GO-LIVE.md` unter 1.1.
