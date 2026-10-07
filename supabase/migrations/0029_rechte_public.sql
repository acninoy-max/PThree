-- ============================================================
-- 0029 — Ausführungsrechte: PUBLIC entziehen, nicht nur anon
-- ============================================================
--
-- WAS FALSCH WAR
-- --------------
-- 0022 schrieb:
--
--   revoke all on function promote_to_coach(text, text) from anon, authenticated;
--
-- Das sieht dicht aus und ist es nicht. Postgres gibt beim Anlegen
-- einer Funktion das Ausführungsrecht an PUBLIC — die Gruppe, in der
-- JEDE Rolle steckt, auch anon und authenticated. Wer anon und
-- authenticated das Recht nimmt, lässt PUBLIC stehen, und über PUBLIC
-- dürfen beide weiter.
--
-- promote_to_coach läuft als security definer und fragt nicht, wer
-- ruft. Damit konnte sich jeder angemeldete Athlet — und über die
-- REST-Schnittstelle sogar ein nicht angemeldeter Aufruf — selbst zum
-- Trainer machen:
--
--   POST /rest/v1/rpc/promote_to_coach  { "ziel_email": "ich@…" }
--
-- Genau das sollte 0022 verhindern. Aufgefallen ist es erst durch
-- check_schema.sql (07.10.2026) — die Prüfung hat richtig gemeldet,
-- nur lief sie bis dahin nie bis zu dieser Zeile.
--
-- Dieselbe Lücke, beim Durchsehen aller security-definer-Funktionen
-- gefunden:
--
--   restore_coach_account(email)  (0006) — machte JEDES Profil zum
--     Trainer und löste seine Klientenverknüpfung. Seit 0022 durch
--     promote_to_coach ersetzt und nirgends mehr benutzt: gelöscht.
--   seed_demo_data(email)         (0004) — schrieb Demo-Klienten in das
--     Konto eines beliebigen Trainers. Bleibt für den SQL-Editor, ist
--     von außen nicht mehr aufrufbar.
--   unlink_client(uuid)           (0024) — harmlos, prüft selbst, ob der
--     Aufrufer der Trainer des Klienten ist; trotzdem dicht gemacht.
--
-- ZWEI SCHLÖSSER
-- --------------
-- 1. Rechte richtig entziehen: PUBLIC, anon, authenticated.
-- 2. promote_to_coach prüft zusätzlich selbst, ob der Aufruf über die
--    Schnittstelle kommt (JWT mit Rolle anon oder authenticated) — und
--    lehnt dann ab. Im SQL-Editor gibt es kein JWT, dort läuft sie wie
--    bisher. Falls irgendwann jemand die Rechte wieder großzügiger
--    setzt, hält das zweite Schloss.

revoke all on function promote_to_coach(text, text) from public, anon, authenticated;

create or replace function promote_to_coach(
  ziel_email text,
  anzeigename text default null
)
returns text language plpgsql security definer
set search_path = public as $$
declare
  nutzer_id uuid;
  name text;
  aufrufer text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''
  );
begin
  -- Zweites Schloss: Über die REST-Schnittstelle niemals, egal welche
  -- Rechte gerade gesetzt sind. Nur SQL-Editor / Dienstrolle.
  if aufrufer in ('anon', 'authenticated') then
    raise exception 'promote_to_coach ist nur im SQL-Editor erlaubt';
  end if;

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

-- `create or replace` behält die Rechte — trotzdem noch einmal, damit
-- diese Datei für sich allein stimmt.
revoke all on function promote_to_coach(text, text) from public, anon, authenticated;

revoke all on function unlink_client(uuid) from public, anon;
grant execute on function unlink_client(uuid) to authenticated;

-- Bedingt: Fehlt die Funktion, darf das nicht die ganze Migration
-- mitreißen — die wichtigen Zeilen oben sollen in jedem Fall greifen.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'seed_demo_data') then
    revoke all on function seed_demo_data(text) from public, anon, authenticated;
  end if;
end;
$$;

drop function if exists restore_coach_account(text);

-- Nachsehen statt hoffen.
do $$
begin
  if has_function_privilege('authenticated', 'promote_to_coach(text, text)', 'execute')
     or has_function_privilege('anon', 'promote_to_coach(text, text)', 'execute') then
    raise exception '0029: promote_to_coach ist weiter von aussen aufrufbar.';
  end if;
  if has_function_privilege('anon', 'unlink_client(uuid)', 'execute') then
    raise exception '0029: unlink_client ist weiter fuer anon aufrufbar.';
  end if;
  if exists (select 1 from pg_proc where proname = 'seed_demo_data')
     and (has_function_privilege('authenticated', 'seed_demo_data(text)', 'execute')
          or has_function_privilege('anon', 'seed_demo_data(text)', 'execute')) then
    raise exception '0029: seed_demo_data ist weiter von aussen aufrufbar.';
  end if;
  if exists (select 1 from pg_proc where proname = 'restore_coach_account') then
    raise exception '0029: restore_coach_account existiert noch.';
  end if;
end;
$$;
