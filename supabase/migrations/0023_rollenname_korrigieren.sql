-- ============================================================
-- 0023 — Ein Tippfehler in 0022, der jede Registrierung anhaelt
-- ============================================================
--
-- In 0022 habe ich `handle_new_user` auf die Standardrolle 'client'
-- umgestellt. Die Rollen-Aufzaehlung aus 0001 kennt diesen Wert nicht:
--
--   create type user_role as enum ('coach', 'athlete', 'org_admin');
--
-- Der Klient heisst in dieser Datenbank 'athlete'. 'client' ist der
-- Name der TABELLE (`clients`), nicht der Rolle — und ich habe das eine
-- fuer das andere gehalten.
--
-- WARUM DAS NICHT BEIM EINSPIELEN AUFFIEL: plpgsql prueft den Rumpf
-- einer Funktion beim Anlegen nicht. `create function` meldet Erfolg;
-- der Fehler kommt erst, wenn der Trigger laeuft.
--
-- WARUM ES JEDE REGISTRIERUNG TRIFFT, NICHT NUR DIE OHNE ANGABE:
-- In `coalesce(x::user_role, 'client')` ist 'client' eine Zeichenkette
-- ohne Typ. Postgres loest den Typ beim PLANEN der Anweisung auf und
-- wandelt die Konstante dann sofort um — bevor irgendein Wert
-- eingesetzt ist. Coalesce kommt gar nicht erst dazu, den ersten
-- Ausdruck zu bevorzugen. Also scheitert auch die Einladung, bei der
-- der Browser ausdruecklich 'athlete' mitschickt.
--
-- Der sichtbare Schaden: `auth.users` bekommt keinen Eintrag, weil der
-- Trigger die Einfuegung mitreisst. Fuer den Athleten sieht es so aus,
-- als sei der Einladungslink kaputt.
--
-- Pruefen kannst du den Zustand vorher und nachher mit:
--
--   select enum_range(null::user_role);
--
-- Muss ausgeben: {coach,athlete,org_admin}

set search_path = public;

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  wanted_role user_role;
begin
  -- 'athlete' als Rueckfall, NICHT 'coach'. Die Rolle aus den
  -- Registrierungs-Metadaten kommt vom Browser; wer sich selbst zum
  -- Trainer erklaeren darf, ist einer. Der Gedanke aus 0022 bleibt —
  -- nur heisst der Wert richtig geschrieben 'athlete'.
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

  -- 'org_admin' gibt es in der Aufzaehlung, aber noch keinen Weg
  -- dorthin. Bis die Ketten-Verwaltung existiert, ist eine
  -- Selbstvergabe aus dem Browser derselbe Fehler wie oben.
  if wanted_role = 'org_admin' then
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
  'Trainerkonto entsteht nur ueber den Dienstschluessel oder ueber '
  'promote_to_coach() im SQL-Editor.';

-- ------------------------------------------------------------
-- Der Trigger selbst
-- ------------------------------------------------------------
--
-- `create or replace function` tauscht nur den Rumpf. Der Trigger aus
-- 0004 haengt an derselben Funktion und greift damit sofort. Die zwei
-- Zeilen stehen hier trotzdem: Wer 0023 in eine frische Datenbank
-- einspielt, in der 0004 aus irgendeinem Grund halb durchlief, soll
-- nicht mit einer Funktion ohne Trigger dastehen.

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
