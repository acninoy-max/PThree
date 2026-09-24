-- ============================================================
-- 0021 — Profil des Klienten: Geburtstag und Bild
-- ============================================================
--
-- Der Athlet soll seine Stammdaten selbst pflegen koennen. Bisher gab
-- es dafuer keinen Ort: Angelegt hat ihn der Trainer, und danach war
-- nichts mehr zu aendern — auch nicht vom Trainer.
--
-- WARUM DAS PROFILBILD ETWAS ANDERES IST ALS DIE FORTSCHRITTSFOTOS
--
-- Beides sind Bilder einer Person, und trotzdem gilt hier nicht der
-- Apparat aus 0020. Ein Fortschrittsfoto zeigt den Koerper und dient
-- der Beurteilung des Trainingsstands — das sind Gesundheitsdaten nach
-- Art. 9. Ein Profilbild ist ein Erkennungszeichen, das jemand
-- freiwillig fuer genau diesen Zweck hochlaedt.
--
-- Also: eigener Bucket, keine Einwilligungstabelle, kein Loeschtrigger.
-- Wer es nicht will, laedt keins hoch.
--
-- ZUM GEBURTSDATUM
--
-- Ein `date` und keine Altersangabe. Ein Alter veraltet jedes Jahr, und
-- niemand pflegt es nach — nach zwei Jahren steht dort eine Zahl, die
-- falsch ist und der trotzdem jemand glaubt.

set search_path = public;

alter table clients
  add column if not exists birth_date date,
  add column if not exists avatar_path text;

-- Eine grobe Plausibilitaet, kein Ausweisabgleich: Ein Tippfehler wie
-- 2206 statt 1996 faellt auf, bevor er in einer Auswertung landet.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_birth_date_plausibel'
  ) then
    alter table clients add constraint clients_birth_date_plausibel
      check (
        birth_date is null
        or (birth_date > date '1900-01-01' and birth_date < current_date)
      );
  end if;
end $$;

-- Pfad im Bucket: "<client_id>/<datei>". Dieselbe Form wie bei den
-- Fortschrittsfotos, damit die Regeln unten gleich aussehen.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_avatar_pfad_passt'
  ) then
    alter table clients add constraint clients_avatar_pfad_passt
      check (avatar_path is null or avatar_path like id::text || '/%');
  end if;
end $$;

comment on column clients.birth_date is
  'Geburtsdatum. Wird beim Anlegen erfasst und kann vom Athleten im '
  'eigenen Profil geaendert werden.';

comment on column clients.avatar_path is
  'Profilbild im Bucket "avatars", Pfad ohne Bucketnamen. Nicht zu '
  'verwechseln mit progress_photos: Ein Profilbild ist ein '
  'Erkennungszeichen, kein Gesundheitsdatum.';

-- ------------------------------------------------------------
-- Der Athlet darf seine eigenen Stammdaten aendern
-- ------------------------------------------------------------
--
-- ACHTUNG, HIER WURDE EINE LUECKE GESCHLOSSEN.
--
-- `clients_self_update` gibt es NICHT erst seit dieser Migration —
-- sie steht seit 0002 im Schema. Der Athlet durfte seine Zeile also
-- schon immer schreiben. Aufgefallen ist es nie, weil keine
-- Oberflaeche es angeboten hat; wer die API direkt gerufen haette,
-- haette `coach_id` auf einen fremden Trainer setzen, sich selbst auf
-- `pro` befoerdern oder seinen Status aendern koennen.
--
-- Der Grund ist grundsaetzlich: Zeilensicherheit entscheidet ueber
-- ZEILEN, nicht ueber SPALTEN. "Darf diese Zeile schreiben" und "darf
-- dieses Feld schreiben" sind zwei verschiedene Fragen, und Postgres
-- beantwortet mit einer Policy nur die erste.
--
-- Der Trigger darunter beantwortet die zweite: Er setzt beim
-- Selbstbearbeiten alle Felder zurueck, die dem Trainer gehoeren.
--
-- Zurueckschreiben statt ablehnen, weil die Oberflaeche ganze Zeilen
-- schickt: Eine Ablehnung waere ein Fehler fuer etwas, das niemand
-- versucht hat.

create or replace function guard_client_self_edit()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  -- Der Trainer darf alles; diese Sperre gilt nur dem Athleten.
  if new.coach_id = auth.uid() then
    return new;
  end if;

  new.coach_id        := old.coach_id;
  new.organisation_id := old.organisation_id;
  new.profile_id      := old.profile_id;
  new.status          := old.status;
  new.level           := old.level;
  new.goal            := old.goal;
  new.started_on      := old.started_on;
  new.created_at      := old.created_at;

  return new;
end $$;

drop trigger if exists clients_self_edit_guard on clients;

create trigger clients_self_edit_guard
  before update on clients
  for each row execute function guard_client_self_edit();

comment on function guard_client_self_edit() is
  'Setzt beim Selbstbearbeiten durch den Athleten alle Felder zurueck, '
  'die dem Trainer gehoeren — Zuordnung, Status, Level, Ziele. '
  'Zeilensicherheit entscheidet ueber Zeilen, nicht ueber Spalten.';

drop policy if exists clients_self_update on clients;

create policy clients_self_update on clients
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ------------------------------------------------------------
-- Der Speicher fuer Profilbilder
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- `safe_uuid` stammt aus 0020 und ist hier aus demselben Grund noetig:
-- Die Regeln stehen auf storage.objects, und diese Tabelle enthaelt die
-- Dateien ALLER Buckets. Postgres darf die Teile einer UND-Verknuepfung
-- in beliebiger Reihenfolge auswerten — eine gescheiterte Umwandlung
-- waere kein "nein", sondern ein Fehler.

drop policy if exists avatar_object_read on storage.objects;
drop policy if exists avatar_object_write on storage.objects;
drop policy if exists avatar_object_delete on storage.objects;

create policy avatar_object_read on storage.objects
  for select using (
    bucket_id = 'avatars'
    and can_access_client(safe_uuid((storage.foldername(name))[1]))
  );

create policy avatar_object_write on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and exists (
      select 1 from clients c
      where c.id = safe_uuid((storage.foldername(name))[1])
        and c.profile_id = auth.uid()
    )
  );

create policy avatar_object_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and exists (
      select 1 from clients c
      where c.id = safe_uuid((storage.foldername(name))[1])
        and c.profile_id = auth.uid()
    )
  );
