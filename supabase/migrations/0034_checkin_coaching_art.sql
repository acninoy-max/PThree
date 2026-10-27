-- ============================================================
-- 0034 — Check-ins: Coaching-Art, Rhythmus je Bereich, Trainer trägt ein
-- ============================================================
--
-- Meeting 27.10.2026 (Joël):
--   * Personal-Training-Klienten misst der Trainer selbst, Online-
--     Klienten messen sich selbst. Beim Anlegen wählbar.
--   * Nicht nur die Maße, auch Gewicht und Befinden (Energie, Schlaf,
--     Stress) brauchen einen Rhythmus: jede Woche, alle 2 Wochen …
--   * Der Trainer muss Check-in und Maße für den Klienten eintragen
--     können, wenn er ihn persönlich sieht.
-- Check-ins bleiben wöchentlich (eine Zeile je Klient und Woche).
--
-- 1. clients.coaching_type: 'personal' | 'online' | 'hybrid'.
--    Bestehende Klienten bekommen 'hybrid' — das ist das Verhalten bis
--    heute (der Klient wird nach allem gefragt). Ändern darf es nur der
--    Trainer; ein eigener Trigger statt eines Eingriffs in
--    guard_client_self_edit (0021/0025), das schon zweimal Ärger machte.
--
-- 2. check_in_configs.weight_every_weeks / wellbeing_every_weeks,
--    wie measure_every_weeks aus 0010. Standard 1 = jede Woche, wie bisher.
--
-- 3. check_ins.entered_by: der Trainer, der die Zeile eingetragen hat;
--    null = der Klient selbst. Gesetzt vom Trigger, nicht vom Browser.
--    guard_check_in_columns bekommt dafür eine neue Fassung:
--      - Trainer-Zeile: Der Trainer darf alles daran ändern.
--      - Klienten-Zeile: Der Trainer darf nur LEERE Maße ergänzen
--        (Maßband im Studio). Was der Klient angegeben hat, bleibt
--        schreibgeschützt, wie seit 0007.
--      - Ändert der Klient eine Trainer-Zeile, wird sie seine
--        (entered_by := null) — ab dann gilt wieder der Schutz.
--    Die Antwort des Trainers (coach_reply) bleibt wie seit 0007.

-- ---------- 1. Coaching-Art ----------

alter table clients
  add column if not exists coaching_type text not null default 'hybrid';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_coaching_type_gueltig') then
    alter table clients add constraint clients_coaching_type_gueltig
      check (coaching_type in ('personal', 'online', 'hybrid'));
  end if;
end;
$$;

comment on column clients.coaching_type is
  'personal = Trainer misst im Studio, online = Klient misst selbst, hybrid = beides (0034).';

create or replace function guard_coaching_type()
returns trigger language plpgsql
set search_path = public as $$
begin
  if new.coaching_type is distinct from old.coaching_type
     and current_user in ('anon', 'authenticated')
     and auth.uid() is distinct from old.coach_id then
    raise exception 'Nur der Trainer kann die Coaching-Art aendern';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_coaching_type_guard on clients;
create trigger clients_coaching_type_guard
  before update on clients
  for each row execute function guard_coaching_type();

-- ---------- 2. Rhythmus je Bereich ----------

alter table check_in_configs
  add column if not exists weight_every_weeks int not null default 1,
  add column if not exists wellbeing_every_weeks int not null default 1;

alter table check_in_configs drop constraint if exists check_in_configs_bereiche_rhythmus;
alter table check_in_configs add constraint check_in_configs_bereiche_rhythmus
  check (weight_every_weeks between 1 and 26 and wellbeing_every_weeks between 1 and 26);

-- ---------- 3. Trainer trägt ein ----------

alter table check_ins
  add column if not exists entered_by uuid references coaches(id) on delete set null;

comment on column check_ins.entered_by is
  'Trainer, der die Zeile eingetragen hat; null = Klient selbst (0034).';

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
    -- Wer eingetragen hat, sagt die Datenbank, nicht der Browser.
    new.entered_by := case when is_coach then auth.uid() else null end;
    return new;
  end if;

  -- UPDATE
  if not is_coach then
    if new.coach_reply is distinct from old.coach_reply
       or new.coach_replied_at is distinct from old.coach_replied_at then
      raise exception 'Nur der Coach kann eine Antwort schreiben.'
        using errcode = 'insufficient_privilege';
    end if;
    -- Der Klient übernimmt die Zeile, sobald er sie selbst bearbeitet.
    new.entered_by := null;
  else
    new.entered_by := old.entered_by;

    if old.entered_by is distinct from auth.uid() then
      -- Zeile des Klienten: seine Angaben bleiben schreibgeschützt …
      if new.submitted_at is distinct from old.submitted_at
         or new.weight_kg   is distinct from old.weight_kg
         or new.energy      is distinct from old.energy
         or new.sleep       is distinct from old.sleep
         or new.stress      is distinct from old.stress
         or new.client_note is distinct from old.client_note
         -- … und Maße darf der Trainer nur ergänzen, nicht überschreiben.
         or (old.shoulders_cm is not null and new.shoulders_cm is distinct from old.shoulders_cm)
         or (old.chest_cm     is not null and new.chest_cm     is distinct from old.chest_cm)
         or (old.waist_cm     is not null and new.waist_cm     is distinct from old.waist_cm)
         or (old.arm_cm       is not null and new.arm_cm       is distinct from old.arm_cm)
         or (old.thigh_cm     is not null and new.thigh_cm     is distinct from old.thigh_cm) then
        raise exception 'Die Angaben des Klienten sind fuer den Coach schreibgeschuetzt.'
          using errcode = 'insufficient_privilege';
      end if;
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

drop trigger if exists check_ins_guard on check_ins;
create trigger check_ins_guard
  before insert or update on check_ins
  for each row execute function guard_check_in_columns();

-- ---------- Nachsehen statt hoffen ----------

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'clients' and column_name = 'coaching_type') then
    raise exception '0034: clients.coaching_type fehlt.';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_name = 'check_ins' and column_name = 'entered_by') then
    raise exception '0034: check_ins.entered_by fehlt.';
  end if;
  if (select prosrc from pg_proc where proname = 'guard_check_in_columns') not like '%entered_by%' then
    raise exception '0034: guard_check_in_columns ist nicht die neue Fassung.';
  end if;
  if (select count(*) from pg_trigger where tgname in ('check_ins_guard', 'clients_coaching_type_guard')
        and not tgisinternal) <> 2 then
    raise exception '0034: Trigger fehlen.';
  end if;
end;
$$;
