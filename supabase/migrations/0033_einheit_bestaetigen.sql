-- ============================================================
-- 0033 — Einheit bestätigen und sperren
-- ============================================================
--
-- Meeting 27.10.2026: Eine abgeschlossene Einheit wird später Grundlage
-- einer Rechnung. Deshalb bestätigt der Trainer sie ausdrücklich, und
-- danach ist sie fest — kein nachträgliches Ändern von Sätzen, Dauer
-- oder Datum, kein Löschen.
--
-- WER DARF WAS
-- ------------
-- Bestätigen: nur der Trainer der Einheit (sessions.coach_id). Zeitpunkt
--   und Person setzt die Datenbank selbst; was der Browser mitschickt,
--   zählt nicht. Ein Klient kann sich nichts selbst bestätigen.
-- Zurücknehmen: über die App niemand. Eine Rechnungsgrundlage, die man
--   still wieder öffnen kann, ist keine.
-- Ändern/Löschen nach dem Bestätigen: über die App niemand, auch der
--   Klient nicht — seine Zeilensicherheit (sessions_client_all, 0002)
--   erlaubt ihm sonst beides über die Schnittstelle. Deshalb sitzt die
--   Sperre hier im Trigger und nicht in der App.
--
-- ZWEI AUSNAHMEN
-- --------------
-- 1. Kaskaden. Wird ein Klient gelöscht (DSGVO), nimmt die Datenbank
--    seine Einheiten mit; wird ein Plan gelöscht, setzt sie plan_id auf
--    null. Das sind Folgeänderungen innerhalb eines anderen Triggers
--    (pg_trigger_depth() > 1) und bleiben erlaubt — sonst ließe sich ein
--    Klient mit bestätigten Einheiten nie mehr löschen.
-- 2. SQL-Editor. Dort läuft die Rolle postgres, nicht anon/authenticated.
--    Eine Korrektur von Hand bleibt so möglich, über die App nicht.

alter table sessions
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references coaches(id) on delete set null;

comment on column sessions.confirmed_at is
  'Vom Trainer bestätigt, danach gesperrt (0033). Grundlage für Abrechnung.';

-- ---------- Wer ruft? ----------

create or replace function einheit_sperre_greift() returns boolean
language sql stable
set search_path = public as $$
  -- Nur Aufrufe über die Schnittstelle, und nur auf oberster Ebene.
  select current_user in ('anon', 'authenticated') and pg_trigger_depth() <= 1;
$$;

-- ---------- sessions ----------

create or replace function sessions_bestaetigung()
returns trigger language plpgsql
set search_path = public as $$
begin
  if not einheit_sperre_greift() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    -- Neu angelegt ist nie schon bestätigt.
    new.confirmed_at := null;
    new.confirmed_by := null;
    return new;
  end if;

  if old.confirmed_at is not null then
    raise exception 'Einheit ist bestaetigt und gesperrt';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.confirmed_at is distinct from old.confirmed_at
     or new.confirmed_by is distinct from old.confirmed_by then
    if new.confirmed_at is null or auth.uid() is distinct from old.coach_id then
      raise exception 'Nur der Trainer kann eine Einheit bestaetigen';
    end if;
    new.confirmed_at := now();
    new.confirmed_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_bestaetigung on sessions;
create trigger sessions_bestaetigung
  before insert or update or delete on sessions
  for each row execute function sessions_bestaetigung();

-- ---------- Übungen und Sätze einer bestätigten Einheit ----------

create or replace function session_teile_gesperrt()
returns trigger language plpgsql
set search_path = public as $$
declare
  v_session uuid;
  v_fest    boolean;
begin
  if not einheit_sperre_greift() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_table_name = 'session_slots' then
    v_session := case when tg_op = 'DELETE' then old.session_id else new.session_id end;
  else
    select sl.session_id into v_session
      from session_slots sl
     where sl.id = case when tg_op = 'DELETE' then old.session_slot_id else new.session_slot_id end;
  end if;

  select confirmed_at is not null into v_fest from sessions where id = v_session;
  if coalesce(v_fest, false) then
    raise exception 'Einheit ist bestaetigt und gesperrt';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists session_slots_gesperrt on session_slots;
create trigger session_slots_gesperrt
  before insert or update or delete on session_slots
  for each row execute function session_teile_gesperrt();

drop trigger if exists session_sets_gesperrt on session_sets;
create trigger session_sets_gesperrt
  before insert or update or delete on session_sets
  for each row execute function session_teile_gesperrt();

-- ---------- Nachsehen statt hoffen ----------

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'sessions' and column_name = 'confirmed_at') then
    raise exception '0033: sessions.confirmed_at fehlt.';
  end if;
  if (select count(*) from pg_trigger
       where tgname in ('sessions_bestaetigung', 'session_slots_gesperrt', 'session_sets_gesperrt')
         and not tgisinternal) <> 3 then
    raise exception '0033: Nicht alle drei Sperr-Trigger sind aktiv.';
  end if;
end;
$$;
