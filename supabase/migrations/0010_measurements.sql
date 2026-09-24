-- ============================================================
-- 0010 — Koerpermasse im Check-in
-- ============================================================
--
-- Aus dem Meeting: Gewicht, Schultern, Brust, Taille, Arm,
-- Oberschenkel. Der Coach stellt je Klient ein, welche Masse
-- abgefragt werden und in welchem Rhythmus.
--
-- Warum in check_ins und nicht in body_metrics:
-- Die Masse werden im selben Vorgang erhoben wie das Befinden,
-- und der Schutz-Trigger aus 0007 haelt sie damit automatisch
-- vor Coach-Aenderungen sicher. `body_metrics` bleibt fuer
-- fremdgemessene Werte reserviert — InBody, Caliper.

set search_path = public;

-- ------------------------------------------------------------
-- 1. Masse am Check-in
--    numeric(5,1): bis 999,9 cm, eine Nachkommastelle. Ein
--    Massband gibt nicht mehr her.
-- ------------------------------------------------------------

alter table check_ins add column if not exists shoulders_cm numeric(5,1);
alter table check_ins add column if not exists chest_cm     numeric(5,1);
alter table check_ins add column if not exists waist_cm     numeric(5,1);
alter table check_ins add column if not exists arm_cm       numeric(5,1);
alter table check_ins add column if not exists thigh_cm     numeric(5,1);

-- Plausibilitaet. Bewusst weit gefasst — es soll Tippfehler
-- abfangen, nicht Koerper bewerten.
alter table check_ins drop constraint if exists check_ins_measurements_sane;
alter table check_ins add constraint check_ins_measurements_sane check (
  (shoulders_cm is null or shoulders_cm between 50 and 250) and
  (chest_cm     is null or chest_cm     between 50 and 250) and
  (waist_cm     is null or waist_cm     between 40 and 250) and
  (arm_cm       is null or arm_cm       between 15 and 100) and
  (thigh_cm     is null or thigh_cm     between 25 and 150)
);

-- ------------------------------------------------------------
-- 2. Konfiguration je Klient
--    Standard: nur Taille. Sie ist das aussagekraeftigste
--    Einzelmass fuer Fettverlust und am schnellsten gemessen.
--    Wer mehr will, schaltet es bewusst dazu.
-- ------------------------------------------------------------

alter table check_in_configs add column if not exists ask_shoulders boolean not null default false;
alter table check_in_configs add column if not exists ask_chest     boolean not null default false;
alter table check_in_configs add column if not exists ask_waist     boolean not null default true;
alter table check_in_configs add column if not exists ask_arm       boolean not null default false;
alter table check_in_configs add column if not exists ask_thigh     boolean not null default false;

-- Rhythmus in Wochen. 4 als Standard: Woechentliches Massband ist
-- viel Aufwand, und die Werte schwanken staerker als sie sich
-- aendern — man misst dann Rauschen statt Fortschritt.
alter table check_in_configs add column if not exists measure_every_weeks int not null default 4;

alter table check_in_configs drop constraint if exists check_in_configs_rhythm_sane;
alter table check_in_configs add constraint check_in_configs_rhythm_sane
  check (measure_every_weeks between 1 and 26);

-- ------------------------------------------------------------
-- 3. Schutz-Trigger erweitern
--    Der Trigger aus 0007 listet die Spalten auf, die der Coach
--    nicht ueberschreiben darf. Ohne diese Ergaenzung waeren die
--    neuen Massspalten ungeschuetzt — der Coach koennte die
--    Selbstauskunft des Klienten stillschweigend aendern.
-- ------------------------------------------------------------

create or replace function guard_check_in_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_coach boolean;
begin
  is_coach := (new.coach_id = auth.uid());

  if tg_op = 'INSERT' then
    if not is_coach and (new.coach_reply is not null or new.coach_replied_at is not null) then
      raise exception 'Nur der Coach kann eine Antwort schreiben.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if not is_coach then
    if new.coach_reply is distinct from old.coach_reply
       or new.coach_replied_at is distinct from old.coach_replied_at then
      raise exception 'Nur der Coach kann eine Antwort schreiben.'
        using errcode = 'insufficient_privilege';
    end if;
  else
    if new.submitted_at  is distinct from old.submitted_at
       or new.weight_kg    is distinct from old.weight_kg
       or new.energy       is distinct from old.energy
       or new.sleep        is distinct from old.sleep
       or new.stress       is distinct from old.stress
       or new.client_note  is distinct from old.client_note
       or new.shoulders_cm is distinct from old.shoulders_cm
       or new.chest_cm     is distinct from old.chest_cm
       or new.waist_cm     is distinct from old.waist_cm
       or new.arm_cm       is distinct from old.arm_cm
       or new.thigh_cm     is distinct from old.thigh_cm then
      raise exception 'Die Angaben des Klienten sind fuer den Coach schreibgeschuetzt.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.coach_reply is distinct from old.coach_reply then
    new.coach_replied_at := case
      when new.coach_reply is null or btrim(new.coach_reply) = '' then null
      else now()
    end;
  end if;

  return new;
end;
$$;

-- Der Trigger selbst bleibt bestehen und zeigt auf die neue
-- Fassung der Funktion. Sicherheitshalber neu setzen.
drop trigger if exists check_ins_guard on check_ins;
create trigger check_ins_guard
  before insert or update on check_ins
  for each row execute function guard_check_in_columns();

-- ------------------------------------------------------------
-- 4. Index fuer die Fortschrittsseite
--    Sie liest die Werte eines Klienten nach Woche sortiert.
-- ------------------------------------------------------------

create index if not exists check_ins_client_week_idx
  on check_ins (client_id, week_of desc);
