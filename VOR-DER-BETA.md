# Vor der Freigabe an die fünf Trainer

Stand: 24. September 2026. Adresse: `https://pthree-wine.vercel.app`

Zwei Teile. **Erst die Datenbank, dann die Wege durch die App.** In der
Reihenfolge, weil ein Fehler in Teil 1 jeden Test in Teil 2 wertlos
macht — du würdest Symptome jagen, deren Ursache eine Zeile SQL entfernt
ist. Genau das ist heute dreimal passiert.

Teil 1: zehn Minuten. Teil 2: zwanzig.

---

# TEIL 1 — Datenbank

Alles im Supabase-SQL-Editor. Jeder Block einzeln, Ergebnis vergleichen.

## 1.1 Der große Schema-Check

Inhalt von `supabase/check_schema.sql` einfügen und ausführen.

**Erwartung:** keine einzige Zeile mit `>>> FEHLT <<<`.

Ganz unten stehen INFO-Zeilen mit den tatsächlichen Zahlen — Klienten,
Pläne, Einheiten, Check-ins. Die sind kein Prüfergebnis, sondern dein
Blick auf den Bestand.

Drei Zeilen darin sind neu und wären bei den Fehlern von heute rot
gewesen:

- *Standardrolle ist athlete, nicht client* (0023)
- *Trigger lässt eine Zeile ohne Besitzer beanspruchen* (0025)
- *keine angenommene Einladung ohne Verknüpfung* (0025)

## 1.2 Sind alle Migrationen wirklich drin?

```sql
select
  (select count(*) from pg_proc where proname = 'promote_to_coach')      as promote_0022,
  (select count(*) from pg_proc where proname = 'unlink_client')         as unlink_0024,
  (select count(*) from pg_type where typname = 'photo_pose')            as fotos_0020,
  (select count(*) from information_schema.columns
    where table_name = 'clients' and column_name = 'avatar_path')        as profil_0021,
  (select count(*) from information_schema.tables
    where table_name = 'client_view_sections')                           as anordnung_0019;
```

**Erwartung:** überall `1`. Eine `0` heißt: Diese Migration fehlt.

## 1.3 Der Rollenname, an dem 0022 gescheitert ist

```sql
select enum_range(null::user_role);
```

**Erwartung:** `{coach,athlete,org_admin}`

Steht dort `client`, ist etwas grundlegend anders als gedacht. Steht
`athlete` **nicht** drin, scheitert jede Registrierung.

## 1.4 Wer ist was?

```sql
select p.email, p.role, p.full_name,
       (c.id is not null) as hat_trainersatz
  from profiles p
  left join coaches c on c.id = p.id
 order by p.role, p.email;
```

**Erwartung:** Du und Joel als `coach` **mit** `hat_trainersatz = true`.
Alle anderen `athlete`.

Ein `coach` ohne Trainersatz ist halb angelegt — die halbe App findet
ihn nicht. Reparatur:

```sql
select promote_to_coach('adresse@example.com', 'Vor Nachname');
```

## 1.5 Hängt jeder Klient am richtigen Zugang?

```sql
select c.full_name,
       c.email                as adresse_in_der_akte,
       u.email                as adresse_des_zugangs,
       case
         when c.profile_id is null then 'noch kein Zugang'
         when lower(coalesce(c.email,'')) = lower(coalesce(u.email,'')) then 'stimmt überein'
         else '>>> WEICHT AB <<<'
       end as befund
  from clients c
  left join auth.users u on u.id = c.profile_id
 order by befund desc, c.full_name;
```

**Erwartung:** nur `stimmt überein` und `noch kein Zugang`.

`>>> WEICHT AB <<<` heißt: Der Trainer schreibt an die eine Adresse, der
Klient meldet sich mit der anderen an. Genau dagegen kommt seit 0024 die
Adresse aus der Akte. Reparatur: `unlink_client(...)` und neu einladen.

## 1.6 Tote Einladungen

```sql
select c.full_name,
       i.accepted_at,
       i.expires_at,
       (c.profile_id is not null) as verknuepft
  from client_invites i
  join clients c on c.id = i.client_id
 order by i.expires_at desc;
```

**Erwartung:** Jede Zeile mit einem `accepted_at` hat `verknuepft = true`.

Angenommen **und** nicht verknüpft ist der Zustand, den der Trigger aus
0021 erzeugt hat. 0025 setzt solche Einladungen wieder auf offen; bleibt
trotzdem eine stehen, ist 0025 nicht eingespielt.

## 1.7 Fotos: liegt etwas ohne Einwilligung herum?

```sql
select
  (select count(*) from progress_photos)                            as fotos,
  (select count(*) from photo_consents where revoked_at is null)    as aktive_einwilligungen,
  (select count(*) from verwaiste_fotos)                            as dateien_ohne_zeile,
  (select count(*) from progress_photos p
     where not exists (select 1 from photo_consents k
                        where k.client_id = p.client_id
                          and k.revoked_at is null))                as fotos_ohne_einwilligung;
```

**Erwartung:** `fotos_ohne_einwilligung` muss **0** sein. Das ist der
einzige Wert hier, der kein Aufräumhinweis ist, sondern ein Rechtsthema.

`dateien_ohne_zeile` über 0 heißt nur: Im Speicher liegen Dateien ohne
Datenbankzeile. Aufräumen kannst du die später, sie sind für niemanden
sichtbar.

## 1.8 Ist die Zeilensicherheit überall an?

```sql
select tablename
  from pg_tables
 where schemaname = 'public'
   and rowsecurity = false
 order by tablename;
```

**Erwartung: keine Zeile.** Jede Tabelle ohne Zeilensicherheit ist eine
Tabelle, die jeder Angemeldete komplett lesen kann.

---

# TEIL 2 — Die Wege durch die App

Erst ab hier, wenn Teil 1 sauber ist.

**Am Mac bist du der Trainer, auf dem Handy der Athlet.** Zwei Rollen
gleichzeitig gehen nur in zwei getrennten Browsern — ein Browser trägt
genau eine Sitzung.

## P1 · Anmelden

| Schritt | Erwartung |
|---|---|
| `/login` aufrufen | **Ein** Formular. Kein „Konto anlegen" mehr |
| Falsches Passwort | „E-Mail oder Passwort stimmt nicht." |
| Adresse, die es nicht gibt | **Derselbe** Satz. Absicht: sonst verrät das Formular, wer hier ein Konto hat |

## P2 · Passwort vergessen

Setzt voraus: Unter *Authentication → URL Configuration* stehen
`https://pthree-wine.vercel.app/**` in den Redirect URLs.

**Alles auf demselben Gerät.** Der Link funktioniert nur im Browser, aus
dem er angefordert wurde — der Gegenschlüssel bleibt dort liegen.

| Schritt | Erwartung |
|---|---|
| `/login` → *Passwort vergessen?* → Adresse → *Link schicken* | „Mail ist unterwegs." |
| Eine Adresse, die es **nicht** gibt | Dieselbe Bestätigung. Auch Absicht |
| Sofort nochmal dieselbe Adresse | „Warte eine Minute" — das ist die SMTP-Sperre, kein Fehler |
| Mail öffnen | Absender ist **eurer**, nicht `noreply@mail.app.supabase.io` |
| Link klicken, zwei verschiedene Passwörter eintippen | Knopf bleibt aus, Hinweis steht sofort da |
| Altes Passwort eintragen | „Das ist dein bisheriges Passwort." |
| Neues setzen | Landet im richtigen Bereich — Athlet bei `/athlete`, Trainer bei `/coach` |
| Denselben Link nochmal klicken | „Der Link ist abgelaufen oder wurde schon benutzt." |

## P3 · Der Test, den man falsch macht

Eine Testmail an eine Adresse, die **nicht** in deinem Supabase-Team ist
und **nicht** dein Resend-Konto. Joels private Adresse, oder GMX.

Mit einer Team-Adresse funktioniert auch der alte eingebaute Versand. Du
würdest also prüfen, dass etwas läuft, das du gerade ersetzt hast — und
es erst bei Joel merken.

In Resend unter **Emails** muss sie mit *Delivered* stehen.

## P4 · Einladung (der Weg mit den drei Fehlern von heute)

| Schritt | Erwartung |
|---|---|
| Klient anlegen **ohne** E-Mail | Im Block *App-Zugang* ein roter Hinweis, dass die Adresse fehlt |
| E-Mail bei *Stammdaten* eintragen, speichern | Hinweis verschwindet |
| *Einladungslink erzeugen*, Link aufs Handy | — |
| Link öffnen | Adresse steht **fest** im Feld, grau, nicht änderbar. Nur Passwort eingeben |
| *Konto anlegen* | Landet im Athletenbereich. *Profil* zeigt die Daten — **nicht** „Zu diesem Zugang gehört kein Klientenkonto" |
| Denselben Link nochmal | „Einladung ungültig" |

## P5 · Zugang trennen

Den brauchst du beim Onboarding von fünf Leuten mit Sicherheit.

| Schritt | Erwartung |
|---|---|
| Klientenakte → *Zugang trennen …* → *Trennen* | „Verknüpfung gelöst" |
| Nachsehen | Pläne, Einheiten, Check-ins, Fotos sind **alle noch da** |
| Neuen Link erzeugen, mit einer **anderen** Adresse annehmen | Klappt |
| Danach nochmal mit der **ersten** Adresse versuchen | Klare Absage: „bereits mit einem anderen Zugang verknüpft" |

## P6 · Ein Training, komplett

Auf dem Handy, über Mobilfunk statt WLAN.

Plan öffnen → Training starten → durchtippen → abschließen. Danach am
Mac in der Klientenakte: Die Einheit steht da, die Kurven bewegen sich.

Das ist der Kern des Produkts und der einzige Weg, den ein Athlet
täglich geht.

## P7 · Fotos

Ein Foto hochladen, in *Fortschritt* den Vorher-Nachher-Vergleich
ansehen, wieder löschen. Der Dateispeicher ist der einzige Teil mit
signierten Adressen und einer eigenen Rechteschicht — der verhält sich
unter einer echten Domain anders als lokal.

Danach 1.7 nochmal laufen lassen.

## P8 · Auf dem Homescreen

Auf dem iPhone: Teilen → *Zum Home-Bildschirm*. Öffnen.

| Erwartung |
|---|
| Startbild mit Logo, kein weißer Schirm |
| Startanimation läuft |
| Keine Safari-Adressleiste |
| Die App funktioniert, ohne dass du nochmal eine IP eintippst |

---

## P9 · Fehlerseite und 404

Gibt es seit dem 24.09. Zwei Handgriffe:

| Schritt | Erwartung |
|---|---|
| `https://pthree-wine.vercel.app/gibtesnicht` aufrufen | Wortmarke, „Diese Seite gibt es nicht", Hinweis auf abgelaufene Einladungslinks, Knopf **Zurück zur App** |
| Knopf drücken | Landet im richtigen Bereich — Trainer bei `/coach`, Athlet bei `/athlete`, abgemeldet bei `/login` |

Die Fehlerseite selbst lässt sich nicht bestellen — sie kommt, wenn
etwas wegbricht. Wenn sie kommt, steht unten eine **Kennung**. Die
gehört in jede Fehlermeldung, die dir ein Tester schickt: Mit ihr
findest du den Fall in den Vercel-Protokollen wieder, ohne sie hast du
„geht nicht".

---

## Was fehlt, und das absichtlich

**Impressum und Datenschutzerklärung gibt es nicht.** Deshalb gilt für
die fünf: **Testdaten, keine echten Klienten.** Sobald einer einen
echten Klienten anlegt und Körperfotos hochlädt, liegen besondere
Kategorien nach Art. 9 DSGVO in eurer Datenbank — ohne
Datenschutzerklärung, ohne Impressum, und mit einem Einwilligungstext,
der von mir ist und nicht von einem Anwalt.

Das ist kein technischer Mangel, den man wegprogrammiert. Das ist ein
Satz, den du den fünfen sagen musst.
