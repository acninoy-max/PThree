-- ============================================================
-- 0020 — Fortschrittsfotos, mit Einwilligung
-- ============================================================
--
-- Aus dem Meeting 16.09: "Testversion eig mit Bildern weil 60-70 % der
-- Kunden Bodycomposition wollen… Dopamin kick 'Boa seh besser aus als
-- vor nem Monat'."
--
-- Das ist das eine Feature in diesem Projekt, bei dem die Rechtslage
-- schwerer wiegt als die Technik.
--
-- WARUM FOTOS ANDERS SIND ALS GEWICHT
--
-- Gewicht und Umfaenge sind Gesundheitsdaten nach Art. 9 DSGVO. Ein
-- Koerperfoto ist dasselbe, nur schaerfer: Es zeigt die Person, es ist
-- biometrisch, und es laesst sich nicht anonymisieren. Eine Zahl kann
-- man von ihrem Traeger loesen, ein Bild nicht.
--
-- Daraus folgen vier Entscheidungen, die alle im Schema stehen und
-- nicht in der Oberflaeche:
--
-- 1. OHNE EINWILLIGUNG KEIN UPLOAD — und zwar erzwungen von der
--    Datenbank. Die App fragt zwar auch, aber die App ist die
--    schwaechere Stelle: Sie kann einen Fehler haben, jemand kann an
--    ihr vorbei die API rufen. `has_photo_consent()` steht deshalb in
--    der WITH-CHECK-Bedingung der Schreibregel. Fehlt die Einwilligung,
--    verweigert Postgres die Zeile.
--
-- 2. NUR DER ATHLET WILLIGT EIN. Der Trainer kann fuer seinen Klienten
--    vieles tun — Plaene schreiben, Einheiten erfassen —, aber nicht in
--    dessen Namen zustimmen. Eine Einwilligung, die ein anderer erteilt,
--    ist keine.
--
-- 3. NUR DER ATHLET LAEDT HOCH. Der Trainer sieht, mehr nicht. Ein
--    Trainer, der Koerperfotos seines Klienten selbst ins System legt,
--    ist eine andere Rechtslage und eine andere Diskussion. Wenn Joel
--    das braucht, bauen wir es bewusst dazu.
--
-- 4. WIDERRUF LOESCHT. Nicht ausblenden, nicht archivieren. Der Trigger
--    unten raeumt beim Widerruf die Zeilen weg; die Dateien im Speicher
--    loescht die Server Action davor. Beides gehoert zusammen — siehe
--    den Kommentar am Trigger.
--
-- DER SPEICHER
--
-- Ein privater Bucket. Nicht oeffentlich, nicht "mit Link sichtbar":
-- Bei einem oeffentlichen Bucket reicht die geratene Dateiadresse, und
-- bei Koerperfotos ist das keine theoretische Sorge. Gelesen wird ueber
-- signierte Links mit kurzer Laufzeit.
--
-- Der Pfad ist `<client_id>/<dateiname>`. Der erste Abschnitt traegt
-- also die Zugehoerigkeit, und genau darauf pruefen die Regeln fuer
-- storage.objects weiter unten.

set search_path = public;

-- ------------------------------------------------------------
-- Einwilligung
-- ------------------------------------------------------------
--
-- Eine Tabelle und keine Spalte auf `clients`: Eine Einwilligung hat
-- einen Verlauf. Erteilt, widerrufen, spaeter neu erteilt — wer das in
-- einem Boolean fuehrt, kann hinterher nicht mehr sagen, ab wann
-- welche Bilder gedeckt waren. Genau das will man belegen koennen.

create table if not exists photo_consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  -- Wer zugestimmt hat. Muss der Athlet selbst sein, siehe Regeln.
  granted_by uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  -- Fassung des Textes, dem zugestimmt wurde. Aendert sich der Text,
  -- steht hier, wer welchen gesehen hat.
  text_version text not null default 'v1',
  constraint photo_consents_zeitfolge
    check (revoked_at is null or revoked_at >= granted_at)
);

-- Hoechstens eine offene Einwilligung je Klient. Zwei gleichzeitig
-- waeren nicht falsch, aber unbeantwortbar: Welche gilt?
create unique index if not exists photo_consents_aktiv_idx
  on photo_consents (client_id)
  where revoked_at is null;

create index if not exists photo_consents_client_idx
  on photo_consents (client_id, granted_at desc);

/**
 * Liegt fuer diesen Klienten eine gueltige Einwilligung vor?
 *
 * `security definer`, damit die Funktion in einer WITH-CHECK-Bedingung
 * nicht selbst wieder an der Zeilensicherheit haengt — sonst haette man
 * eine Regel, die sich auf eine Abfrage stuetzt, die dieselbe Regel
 * braucht.
 */
create or replace function has_photo_consent(target uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from photo_consents pc
    where pc.client_id = target
      and pc.revoked_at is null
  );
$$;

-- ------------------------------------------------------------
-- Die Fotos
-- ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'photo_pose') then
    -- Drei Ansichten. Mehr braucht niemand, und weniger vergleicht sich
    -- schlecht: Eine Veraenderung am Ruecken sieht man von vorne nicht.
    create type photo_pose as enum ('front', 'side', 'back');
  end if;
end $$;

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  -- Der Tag, den der Athlet meint — nicht der Upload-Zeitpunkt. Wer
  -- Sonntag fotografiert und Dienstag hochlaedt, will Sonntag sehen.
  taken_on date not null default current_date,
  pose photo_pose not null,
  -- Pfad im Bucket, ohne Bucketnamen: "<client_id>/<datei>".
  storage_path text not null unique,
  width int,
  height int,
  bytes int,
  -- Wer hochgeladen hat. Heute immer der Athlet; die Spalte haelt das
  -- fest, falls das je aufgeht.
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint progress_photos_pfad_passt
    check (storage_path like client_id::text || '/%'),
  constraint progress_photos_masse
    check (
      (width is null or width between 1 and 10000)
      and (height is null or height between 1 and 10000)
      and (bytes is null or bytes between 1 and 12000000)
    )
);

create index if not exists progress_photos_client_idx
  on progress_photos (client_id, taken_on desc, pose);

-- ------------------------------------------------------------
-- Rechte
-- ------------------------------------------------------------

alter table photo_consents  enable row level security;
alter table progress_photos enable row level security;

-- --- Einwilligung ---

drop policy if exists photo_consents_read on photo_consents;
drop policy if exists photo_consents_grant on photo_consents;
drop policy if exists photo_consents_revoke on photo_consents;

-- Lesen darf, wer den Klienten sehen darf: Der Trainer muss erkennen
-- koennen, ob eine Einwilligung vorliegt — sonst steht er vor einer
-- leeren Galerie und weiss nicht, warum.
create policy photo_consents_read on photo_consents
  for select using (can_access_client(client_id));

-- Erteilen nur in eigenem Namen, und nur fuer den eigenen Klientensatz.
-- Beide Bedingungen zusammen: `granted_by = auth.uid()` allein wuerde
-- einem Trainer erlauben, sich selbst als Zustimmenden einzutragen.
create policy photo_consents_grant on photo_consents
  for insert with check (
    granted_by = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_id and c.profile_id = auth.uid()
    )
  );

-- Widerrufen darf nur der Athlet. Ein Trainer, der die Einwilligung
-- seines Klienten widerruft, wuerde dessen Bilder loeschen.
create policy photo_consents_revoke on photo_consents
  for update using (
    exists (
      select 1 from clients c
      where c.id = client_id and c.profile_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from clients c
      where c.id = client_id and c.profile_id = auth.uid()
    )
  );

-- --- Fotos ---

drop policy if exists progress_photos_read on progress_photos;
drop policy if exists progress_photos_insert on progress_photos;
drop policy if exists progress_photos_delete on progress_photos;

-- Sehen: Athlet und betreuender Trainer. Ohne gueltige Einwilligung
-- sieht auch der Trainer nichts — ein Widerruf, der nur das Hochladen
-- stoppt, waere keiner.
create policy progress_photos_read on progress_photos
  for select using (
    can_access_client(client_id) and has_photo_consent(client_id)
  );

-- Hochladen: nur der Athlet, nur mit Einwilligung.
create policy progress_photos_insert on progress_photos
  for insert with check (
    has_photo_consent(client_id)
    and uploaded_by = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_id and c.profile_id = auth.uid()
    )
  );

-- Loeschen: der Athlet jederzeit. Auch ohne Einwilligung — sonst
-- koennte nach einem Widerruf niemand mehr aufraeumen.
create policy progress_photos_delete on progress_photos
  for delete using (
    exists (
      select 1 from clients c
      where c.id = client_id and c.profile_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Widerruf raeumt auf
-- ------------------------------------------------------------
--
-- WICHTIG UND UNVOLLSTAENDIG: Dieser Trigger loescht die ZEILEN. Die
-- DATEIEN im Speicher loescht er nicht — Postgres kommt an den Bucket
-- nicht heran.
--
-- Deshalb loescht die Server Action `revokePhotoConsentAction` erst die
-- Dateien und traegt den Widerruf danach ein. Der Trigger ist der
-- Rueckhalt fuer den Fall, dass jemand direkt im SQL-Editor widerruft:
-- Dann sind die Zeilen weg, die Dateien bleiben als Waisen liegen, und
-- die Abfrage `verwaiste_fotos` unten findet sie.
--
-- Ein Trigger, der so tut, als raeume er alles auf, waere gefaehrlicher
-- als gar keiner. Deshalb steht es hier.

create or replace function purge_photos_on_revoke()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.revoked_at is not null and old.revoked_at is null then
    delete from progress_photos where client_id = new.client_id;
  end if;
  return new;
end $$;

drop trigger if exists photo_consents_purge on photo_consents;

create trigger photo_consents_purge
  after update on photo_consents
  for each row execute function purge_photos_on_revoke();

comment on function purge_photos_on_revoke() is
  'Loescht beim Widerruf die Fotozeilen. Die Dateien im Speicher muss '
  'die Anwendung loeschen — Postgres erreicht den Bucket nicht.';

-- ------------------------------------------------------------
-- Der Speicher
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  6000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/**
 * Text zu uuid, ohne zu scheitern.
 *
 * Klingt nach Bequemlichkeit, ist aber noetig: Die Regeln unten stehen
 * auf `storage.objects`, und diese Tabelle enthaelt die Dateien ALLER
 * Buckets. Der erste Pfadabschnitt ist nur in unserem Bucket eine
 * client_id; anderswo ist es irgendein Ordnername.
 *
 * Man koennte meinen, `bucket_id = 'progress-photos' and …::uuid`
 * schuetze davor — tut es nicht. Postgres darf die Teile einer
 * UND-Verknuepfung in beliebiger Reihenfolge auswerten und muss nicht
 * abbrechen, sobald der erste falsch ist. Ein Ordner "avatare" in einem
 * anderen Bucket wuerde die Umwandlung also auch dann versuchen, wenn
 * die Bucket-Bedingung schon nicht passt — und eine gescheiterte
 * Umwandlung ist kein "nein", sondern ein Fehler, der die ganze Abfrage
 * abbricht.
 *
 * Also: ungueltig ergibt NULL, und `can_access_client(null)` ist false.
 */
create or replace function safe_uuid(t text)
returns uuid language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

comment on function safe_uuid(text) is
  'Text zu uuid; ungueltige Eingabe ergibt NULL statt eines Fehlers. '
  'Fuer Regeln auf storage.objects, wo Pfade aus fremden Buckets '
  'mitgeprueft werden.';

-- Der erste Pfadabschnitt ist die client_id. `storage.foldername()`
-- zerlegt den Pfad; [1] ist der Ordner.
drop policy if exists progress_photos_object_read on storage.objects;
drop policy if exists progress_photos_object_insert on storage.objects;
drop policy if exists progress_photos_object_delete on storage.objects;

create policy progress_photos_object_read on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and can_access_client(safe_uuid((storage.foldername(name))[1]))
    and has_photo_consent(safe_uuid((storage.foldername(name))[1]))
  );

create policy progress_photos_object_insert on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and has_photo_consent(safe_uuid((storage.foldername(name))[1]))
    and exists (
      select 1 from clients c
      where c.id = safe_uuid((storage.foldername(name))[1])
        and c.profile_id = auth.uid()
    )
  );

create policy progress_photos_object_delete on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from clients c
      where c.id = safe_uuid((storage.foldername(name))[1])
        and c.profile_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Waisen finden
-- ------------------------------------------------------------
--
-- Dateien ohne Zeile. Entstehen, wenn direkt im SQL-Editor widerrufen
-- wurde oder ein Upload nach dem Speichern der Datei abbrach. Keine
-- Automatik: Loeschen ist endgueltig, das soll jemand sehen wollen.
--
--   select * from verwaiste_fotos;

create or replace view verwaiste_fotos as
  select o.name as storage_path, o.created_at, o.owner
    from storage.objects o
   where o.bucket_id = 'progress-photos'
     and not exists (
       select 1 from progress_photos p where p.storage_path = o.name
     );

comment on view verwaiste_fotos is
  'Dateien im Foto-Bucket ohne zugehoerige Zeile. Nach einem Widerruf '
  'im SQL-Editor oder einem abgebrochenen Upload. Von Hand pruefen und '
  'loeschen.';

comment on table progress_photos is
  'Fortschrittsfotos. Gesundheitsdaten nach Art. 9 DSGVO: Lesen und '
  'Schreiben haengen an einer gueltigen Einwilligung, erzwungen durch '
  'die Zeilensicherheit und nicht durch die Anwendung.';

comment on table photo_consents is
  'Einwilligung in die Verarbeitung von Koerperfotos. Nur der Athlet '
  'selbst kann sie erteilen und widerrufen. Der Verlauf bleibt stehen, '
  'damit nachvollziehbar ist, ab wann welche Bilder gedeckt waren.';
