-- ============================================================
-- 0022 — Zwei Loecher vor dem Ausrollen schliessen
-- ============================================================
--
-- Beides faellt im Betrieb auf deinem Mac nicht auf. Beides waere ab
-- dem Moment ein Problem, in dem die App unter einer Adresse steht, die
-- jemand anders aufrufen kann.

set search_path = public;

-- ------------------------------------------------------------
-- 1. Die Waisen-Abfrage las an der Zeilensicherheit vorbei
-- ------------------------------------------------------------
--
-- `verwaiste_fotos` aus 0020 ist eine Sicht auf `storage.objects`. In
-- Postgres laeuft eine Sicht standardmaessig mit den Rechten ihres
-- EIGENTUEMERS, nicht denen des Aufrufers — und Eigentuemer ist die
-- Rolle, die die Migration ausgefuehrt hat. Ohne die Zeile unten
-- umgeht jede Abfrage darauf die Regeln, die auf storage.objects und
-- progress_photos haengen.
--
-- Supabase vergibt ausserdem auf alles im Schema `public` ein
-- Leserecht fuer `anon` und `authenticated`. Zusammengenommen haette
-- also jeder angemeldete Nutzer — und je nach Einstellung sogar ein
-- nicht angemeldeter — die Dateipfade aller verwaisten Koerperfotos
-- lesen koennen. Die Pfade beginnen mit der client_id.
--
-- Ein Werkzeug fuer den Betreiber, das durch die Vordertuer steht.
--
-- Zwei Riegel, weil einer reissen kann:
--   security_invoker  — die Sicht rechnet mit den Rechten des Aufrufers
--   revoke            — und ausser dem Eigentuemer darf sie niemand lesen

create or replace view verwaiste_fotos
  with (security_invoker = true) as
  select o.name as storage_path, o.created_at, o.owner
    from storage.objects o
   where o.bucket_id = 'progress-photos'
     and not exists (
       select 1 from progress_photos p where p.storage_path = o.name
     );

revoke all on verwaiste_fotos from anon, authenticated;

comment on view verwaiste_fotos is
  'Dateien im Foto-Bucket ohne zugehoerige Zeile. NUR fuer den '
  'SQL-Editor: security_invoker plus Entzug der Leserechte fuer anon '
  'und authenticated. Ohne beides waere es ein Fenster an der '
  'Zeilensicherheit vorbei.';

-- ------------------------------------------------------------
-- 2. Trainerkonten entstehen nicht mehr von selbst
-- ------------------------------------------------------------
--
-- `handle_new_user` aus 0004 liest die Rolle aus den Metadaten der
-- Registrierung und nimmt `coach` als Standard. Die Metadaten schickt
-- der Browser mit — sie sind eine Angabe des Anmeldenden, keine
-- Entscheidung des Servers.
--
-- Solange die App nur auf einem Laptop lief, war das egal. Unter einer
-- oeffentlichen Adresse heisst es: Wer das Registrierungsformular
-- findet, legt sich ein Trainerkonto an. Sehen wuerde er fremde Daten
-- nicht — dafuer sorgt die Zeilensicherheit —, aber er waere drin,
-- koennte Klienten anlegen und zaehlt in jeder Statistik mit.
--
-- NACHTRAEGLICH KORRIGIERT: In der ausgelieferten Fassung stand hier
-- 'client'. Die Aufzaehlung `user_role` kennt diesen Wert nicht — der
-- Klient heisst 'athlete'; 'clients' ist der Name der Tabelle. Dadurch
-- scheiterte jede Registrierung. Diese Datei traegt jetzt den richtigen
-- Wert, damit ein Neuaufbau der Datenbank aus der Reihenfolge heraus
-- stimmt. Fuer die bereits laufende Datenbank gibt es 0023, das
-- dieselbe Funktion noch einmal ersetzt.
--
-- Neuer Standard ist deshalb `athlete`. Ein Trainerkonto entsteht nur
-- noch auf einem von zwei Wegen:
--
--   a) jemand traegt die Rolle im Supabase-Dashboard von Hand ein,
--      bevor sich der Trainer registriert, oder
--   b) ein bestehender Trainer wird per SQL angelegt.
--
-- Beides sind bewusste Handgriffe von jemandem mit Zugang. Genau so
-- soll es in der Beta sein — eine Selbstbedienungs-Registrierung fuer
-- Trainer ist eine Produktentscheidung und keine Voreinstellung.

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  wanted_role user_role;
begin
  -- `athlete` als Rueckfall, NICHT `coach`. Die Metadaten kommen vom
  -- Browser; wer sich selbst zum Trainer erklaeren kann, ist einer.
  wanted_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::user_role,
    'athlete'::user_role
  );

  -- Und selbst wenn jemand 'coach' mitschickt: Nur Konten, die ueber
  -- den Dienstschluessel angelegt wurden, duerfen das. Eine
  -- Registrierung aus dem Browser laeuft als `anon`.
  if wanted_role = 'coach' and coalesce(
    current_setting('request.jwt.claim.role', true), ''
  ) not in ('service_role', 'supabase_admin') then
    wanted_role := 'athlete'::user_role;
  end if;

  insert into profiles (id, role, full_name, email)
  values (
    new.id,
    wanted_role,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  if wanted_role = 'coach' then
    insert into coaches (id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name',
               split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

comment on function handle_new_user() is
  'Legt Profil und ggf. Coach-Eintrag an. Standardrolle ist ATHLETE: '
  'Die Rolle aus den Registrierungs-Metadaten kommt vom Browser, und '
  'wer sich selbst zum Trainer erklaeren darf, ist einer. Ein '
  'Trainerkonto entsteht nur ueber den Dienstschluessel oder von Hand.';

-- ------------------------------------------------------------
-- Einen bestehenden Zugang zum Trainer machen
-- ------------------------------------------------------------
--
-- Der Weg fuer das Onboarding in der Beta. Im SQL-Editor aufrufen,
-- nachdem sich der Trainer ganz normal registriert hat:
--
--   select promote_to_coach('joel@example.com', 'Joel Hogenkamp');
--
-- Bewusst eine Funktion und kein Update von Hand: Profil und
-- coaches-Eintrag muessen zusammen entstehen, sonst hat jemand die
-- Rolle, aber keinen Trainersatz — und die halbe App findet ihn nicht.

create or replace function promote_to_coach(
  ziel_email text,
  anzeigename text default null
)
returns text language plpgsql security definer
set search_path = public as $$
declare
  nutzer_id uuid;
  name text;
begin
  select id into nutzer_id from auth.users where lower(email) = lower(ziel_email);
  if nutzer_id is null then
    return format('Kein Zugang mit %s. Erst registrieren lassen.', ziel_email);
  end if;

  name := coalesce(anzeigename, split_part(ziel_email, '@', 1));

  update profiles set role = 'coach', full_name = coalesce(full_name, name)
   where id = nutzer_id;

  insert into coaches (id, display_name)
  values (nutzer_id, name)
  on conflict (id) do update set display_name = excluded.display_name;

  return format('%s ist jetzt Trainer.', ziel_email);
end;
$$;

revoke all on function promote_to_coach(text, text) from anon, authenticated;

comment on function promote_to_coach(text, text) is
  'Macht einen bestehenden Zugang zum Trainer — Profil und '
  'coaches-Eintrag zusammen. Nur fuer den SQL-Editor; anon und '
  'authenticated haben kein Ausfuehrungsrecht.';
