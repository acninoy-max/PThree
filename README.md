# PT FIVE

Das Betriebssystem für freelance Personal Trainer — Trainingspläne, Klienten-Tracking,
Kommunikation, Termine und Abrechnung in einem System.

**Stand:** Datenbank steht. Coach-Web läuft (Login, Feed, Klienten anlegen,
einladen, bearbeiten, löschen, Verläufe). Athlete-Bereich läuft als Mobile Web
(Tagesdashboard, Satz-Logging, Fortschritt).

## Routen

| Pfad | Wer |
|---|---|
| `/` | Weiche — leitet nach Rolle weiter |
| `/coach`, `/coach/clients`, `/coach/clients/[id]` | Trainer |
| `/athlete`, `/athlete/log`, `/athlete/progress` | Klient |
| `/login`, `/invite/[token]` | öffentlich |

Die Rollenweiche steckt in `middleware.ts`. Ein Browser trägt genau **eine**
Sitzung — wer beide Rollen gleichzeitig testen will, braucht ein zweites
Fenster im privaten Modus.

## Aufbau

```
ptfive/
  apps/
    coach/                  Next.js — beide Oberflächen
      app/coach/              Trainer-Bereich
      app/athlete/            Klienten-Bereich, mobil optimiert
      app/invite/[token]/     Registrierung per Einladung
      app/nav.tsx             geteilte Bausteine, per "@/app/..." importiert
    athlete/                Expo — native App, kommt nach der Beta
  packages/
    tokens/                 Brand Guide v16 in Code, inkl. Kontrastprüfung
    types/                  Domänenmodell (Muster, Slots, Pläne, Termine)
    coach-engine/           Plateau-, Inaktivitäts- und Fortschrittserkennung
  supabase/
    migrations/             Schema, Row Level Security, QA-Views
```

## Die zentrale Idee im Code

Ein Trainingsplan besteht aus **Slots**. Ein Slot ist ein Bewegungsmuster
(push, pull, squat, hinge, overhead) plus Block — die konkrete Übung ist nur
das Werkzeug darin und jederzeit tauschbar.

Deshalb führt `coach-engine` die Progression **pro Muster**, nicht pro Übung.
Wer das Werkzeug wechselt oder zwischendurch allein trainiert, verliert seine
Historie nicht. Genau daran scheitern die Wettbewerber (siehe Joëls Research
zum "1Fit-Problem") — hier ist es der Kern des Datenmodells und durch Tests
abgesichert.

## Voraussetzungen

- Node 20 oder neuer
- pnpm (`npm install -g pnpm`)
- Supabase-Projekt in der EU-Region (Frankfurt oder Amsterdam)

## Loslegen

```bash
cd ptfive
pnpm install
pnpm --filter @ptfive/coach dev
```

Dann `http://localhost:3000` öffnen. Beim ersten Start ein Coach-Konto anlegen.

### Datenbank aufsetzen

Die Migrationen in `supabase/migrations/` in dieser Reihenfolge im Supabase
SQL Editor ausführen:

1. `0001_init.sql` — Tabellen und Aufzählungstypen
2. `0002_rls.sql` — Row Level Security
3. `0003_qa_views.sql` — Aggregations-Views für das Ketten-Dashboard
4. `0004_auth_and_seed.sql` — Registrierungs-Trigger, Übungsbibliothek, Demo-Funktion
5. `0005_invites.sql` — Einladungslinks und deren Annahme

### Die zwei Rollen testen

Wer sich unter `/login` registriert, wird **Coach**. Wer über einen
Einladungslink kommt, wird **Athlet**.

Zum Durchspielen: als Coach einen Klienten anlegen, Einladungslink erzeugen,
den Link **in einem privaten Fenster** öffnen und dort registrieren. Dann
Training loggen — und im ersten Fenster als Coach den Feed neu laden.

Das private Fenster ist kein Vorschlag, sondern nötig: Meldet man sich im
selben Browser als Athlet an, wird die Coach-Sitzung überschrieben.

### Demo-Daten

Nach der Registrierung einmal im SQL Editor ausführen:

```sql
select seed_demo_data('deine@mail.de');
```

Legt drei Klienten mit Trainingshistorie an, die die Engine gezielt auslöst:
Lisa stagniert im Drücken, Mark ist seit zwölf Tagen inaktiv, Sanne steigert
sich in der Hüftbeuge.

## Zwei Dinge, die nicht verhandelbar sind

**Mandantentrennung.** Die App filtert nicht — die Datenbank gibt nichts
anderes heraus. Jede Tabelle hat Row Level Security. Ein Coach sieht
strukturell nur seine eigenen Klienten.

**Gesundheitsdaten.** Gewicht, Körpermaße und Fotos sind besondere Kategorie
nach Art. 9 DSGVO. Das heißt: EU-Region, privater Storage mit signierten URLs,
Auftragsverarbeitungsverträge mit Supabase, Vercel und Mollie, sowie ein
Löschkonzept. Ketten-Admins sehen ausschließlich aggregierte Kennzahlen je
Trainer — nie Einzeldaten von Klienten. Das ist Qualitätssicherung, keine
Überwachung, und genau so wird es auch verkauft.

## Nächste Schritte

1. `apps/coach` — Next.js mit Supabase-Anbindung, Klientenliste, Coach-Feed
2. `apps/athlete` — Expo, Tagesdashboard und Satz-Logging
3. Termin-Modul in beiden Apps
4. Mollie Connect (Phase 2)
