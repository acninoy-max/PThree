-- ============================================================
-- 0007 — Check-ins: Integrität der Antwortspalten
-- ============================================================
--
-- Ausgangslage: check_ins_access erlaubt "for all" für jeden, der über
-- can_access_client() an den Klienten herankommt. Das ist für die
-- Eingabespalten richtig — der Athlet füllt sie selbst aus. Für
-- coach_reply und coach_replied_at ist es falsch: dort könnte sich ein
-- Klient über die API selbst eine Coach-Antwort schreiben.
--
-- RLS kann nicht spaltenweise unterscheiden. Ein Trigger kann es.
--
-- Umgekehrt gilt dasselbe für submitted_at: Der Coach soll ein Check-in
-- nicht im Namen des Klienten "abschicken" können. Das würde die
-- Auswertung verfälschen, wer wann wirklich geantwortet hat.

set search_path = public;

create or replace function guard_check_in_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_coach boolean;
begin
  -- Ist der Aufrufer der betreuende Coach dieses Check-ins?
  is_coach := (new.coach_id = auth.uid());

  if tg_op = 'INSERT' then
    if not is_coach and (new.coach_reply is not null or new.coach_replied_at is not null) then
      raise exception 'Nur der Coach kann eine Antwort schreiben.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  -- UPDATE
  if not is_coach then
    if new.coach_reply is distinct from old.coach_reply
       or new.coach_replied_at is distinct from old.coach_replied_at then
      raise exception 'Nur der Coach kann eine Antwort schreiben.'
        using errcode = 'insufficient_privilege';
    end if;
  else
    -- Der Coach darf die Selbstauskunft des Klienten nicht überschreiben.
    if new.submitted_at is distinct from old.submitted_at
       or new.weight_kg   is distinct from old.weight_kg
       or new.energy      is distinct from old.energy
       or new.sleep       is distinct from old.sleep
       or new.stress      is distinct from old.stress
       or new.client_note is distinct from old.client_note then
      raise exception 'Die Angaben des Klienten sind für den Coach schreibgeschützt.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Der Antwortzeitpunkt wird gesetzt, nicht behauptet.
  if new.coach_reply is distinct from old.coach_reply then
    new.coach_replied_at := case
      when new.coach_reply is null or btrim(new.coach_reply) = '' then null
      else now()
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists check_ins_guard on check_ins;
create trigger check_ins_guard
  before insert or update on check_ins
  for each row execute function guard_check_in_columns();

-- ------------------------------------------------------------
-- Jeder Klient bekommt eine Check-in-Konfiguration.
-- Die Anwendung fällt zwar auf Standardwerte zurück, wenn keine Zeile
-- da ist; eine echte Zeile ist trotzdem besser, weil der Coach sie
-- später ändern können soll, ohne dass etwas nachgelegt werden muss.
-- ------------------------------------------------------------

insert into check_in_configs (client_id)
select c.id from clients c
where not exists (
  select 1 from check_in_configs k where k.client_id = c.id
);

create or replace function create_default_check_in_config()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into check_in_configs (client_id)
  values (new.id)
  on conflict (client_id) do nothing;
  return new;
end;
$$;

drop trigger if exists clients_default_check_in_config on clients;
create trigger clients_default_check_in_config
  after insert on clients
  for each row execute function create_default_check_in_config();
