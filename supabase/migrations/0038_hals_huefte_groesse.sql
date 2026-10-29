-- ============================================================
-- 0038 — Hals, Hüfte und Körpergröße für die Körperfett-Schätzung
-- ============================================================
--
-- Meeting 29.10.2026: Die YMCA-Schätzung aus 0037 (Taille + Gewicht)
-- ist grob. Mit Hals und Körpergröße (bei Frauen dazu die Hüfte) geht
-- die genauere Navy-Formel. Beides soll WÄHLBAR sein: Fehlt etwas,
-- rechnet die App mit dem, was da ist (app/koerperfett.ts):
--   Navy, wenn möglich → sonst YMCA → sonst kein Wert.
--
-- 1. check_ins.neck_cm / hip_cm — zwei weitere Maße wie die aus 0010,
--    mit Plausibilitätsgrenzen.
-- 2. check_in_configs.ask_neck / ask_hip — der Trainer schaltet sie
--    ein wie die anderen Maße. Standard: aus.
-- 3. clients.height_cm — Stammdaten, vom Trainer eingetragen.
-- 4. guard_check_in_columns: neue Fassung, die Hals und Hüfte genauso
--    schützt wie die übrigen Maße (Klientenangaben schreibgeschützt,
--    der Trainer ergänzt nur leere). Sonst unverändert gegenüber 0034.

-- ---------- 1. Maße ----------

alter table check_ins
  add column if not exists neck_cm numeric(5,1),
  add column if not exists hip_cm  numeric(5,1);

alter table check_ins drop constraint if exists check_ins_hals_huefte_plausibel;
alter table check_ins add constraint check_ins_hals_huefte_plausibel check (
  (neck_cm is null or neck_cm between 20 and 70) and
  (hip_cm  is null or hip_cm  between 50 and 200)
);

-- ---------- 2. Einstellungen ----------

alter table check_in_configs
  add column if not exists ask_neck boolean not null default false,
  add column if not exists ask_hip  boolean not null default false;

-- ---------- 3. Körpergröße ----------

alter table clients
  add column if not exists height_cm numeric(4,1);

alter table clients drop constraint if exists clients_height_plausibel;
alter table clients add constraint clients_height_plausibel
  check (height_cm is null or height_cm between 100 and 250);

comment on column clients.height_cm is
  'Körpergröße in cm, für die Körperfett-Schätzung nach Navy (0038).';

-- ---------- 4. Check-in-Schutz ----------

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
    new.entered_by := case when is_coach then auth.uid() else null end;
    return new;
  end if;

  if not is_coach then
    if new.coach_reply is distinct from old.coach_reply
       or new.coach_replied_at is distinct from old.coach_replied_at then
      raise exception 'Nur der Coach kann eine Antwort schreiben.'
        using errcode = 'insufficient_privilege';
    end if;
    new.entered_by := null;
  else
    new.entered_by := old.entered_by;

    if old.entered_by is distinct from auth.uid() then
      if new.submitted_at is distinct from old.submitted_at
         or new.weight_kg   is distinct from old.weight_kg
         or new.energy      is distinct from old.energy
         or new.sleep       is distinct from old.sleep
         or new.stress      is distinct from old.stress
         or new.client_note is distinct from old.client_note
         or (old.shoulders_cm is not null and new.shoulders_cm is distinct from old.shoulders_cm)
         or (old.chest_cm     is not null and new.chest_cm     is distinct from old.chest_cm)
         or (old.waist_cm     is not null and new.waist_cm     is distinct from old.waist_cm)
         or (old.arm_cm       is not null and new.arm_cm       is distinct from old.arm_cm)
         or (old.thigh_cm     is not null and new.thigh_cm     is distinct from old.thigh_cm)
         -- neu in 0038
         or (old.neck_cm      is not null and new.neck_cm      is distinct from old.neck_cm)
         or (old.hip_cm       is not null and new.hip_cm       is distinct from old.hip_cm) then
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
  if (select count(*) from information_schema.columns
       where table_name = 'check_ins' and column_name in ('neck_cm', 'hip_cm')) <> 2 then
    raise exception '0038: Hals/Hüfte fehlen in check_ins.';
  end if;
  if (select count(*) from information_schema.columns
       where table_name = 'check_in_configs' and column_name in ('ask_neck', 'ask_hip')) <> 2 then
    raise exception '0038: Schalter fuer Hals/Hüfte fehlen.';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_name = 'clients' and column_name = 'height_cm') then
    raise exception '0038: clients.height_cm fehlt.';
  end if;
  if (select prosrc from pg_proc where proname = 'guard_check_in_columns') not like '%neck_cm%'
     or (select prosrc from pg_proc where proname = 'guard_check_in_columns') not like '%entered_by%' then
    raise exception '0038: guard_check_in_columns ist nicht die neue Fassung.';
  end if;
end;
$$;
