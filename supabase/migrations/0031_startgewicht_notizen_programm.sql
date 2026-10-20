-- ============================================================
-- 0031 — Startgewicht, Notizen je Übung, Plan als Programm
-- ============================================================
--
-- Drei Wünsche aus dem Test vom 15./20.10.2026 (UMSETZUNG-BASIS.md):
--
-- B5  plan_slots.target_weight_kg — Startgewicht im Plan. Beim Tracken
--     steht es als Vorschlag im kg-Feld. Leer = keine Vorgabe.
-- B7  client_exercise_notes — Kurznotiz je Klient und Übung
--     („Handgelenk ab 120 kg"), die beim nächsten Tracken genau dort
--     oben steht. Nur für den Trainer; der Athlet sieht sie nicht.
-- B3  plan_to_template(plan, name) — den Plan eines Klienten als
--     eigenes Programm speichern.
--
-- assign_template und copy_template (0028) werden hier NEU angelegt,
-- nur damit sie die neue Spalte mitkopieren. Signatur, Rechte und
-- Nachzählen sind unverändert. Ohne diesen Schritt ginge das
-- Startgewicht beim Zuweisen still verloren — genau die Art Fehler, die
-- niemand bemerkt.

-- ---------- B5: Startgewicht ----------

alter table plan_slots
  add column if not exists target_weight_kg numeric(6, 2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plan_slots_target_weight_plausibel'
  ) then
    alter table plan_slots add constraint plan_slots_target_weight_plausibel
      check (target_weight_kg is null or target_weight_kg between 0 and 1000);
  end if;
end;
$$;

comment on column plan_slots.target_weight_kg is
  'Startgewicht in kg als Vorschlag beim Tracken (0031). null = keine Vorgabe.';

-- Die gemeinsame Slot-Kopie für alle drei Funktionen. Eine Stelle
-- statt drei: Kommt die nächste Spalte dazu, wird sie hier ergänzt und
-- keine Kopie vergisst sie.
create or replace function copy_plan_slots(p_from_day uuid, p_to_day uuid)
returns int
language plpgsql security invoker
set search_path = public as $$
declare
  v_n int;
begin
  insert into plan_slots (
    plan_day_id, position, pattern, muscle_group, block, label,
    default_exercise_id, target_sets, target_reps_min, target_reps_max,
    target_weight_kg, superset_group, tempo, rest_seconds, note
  )
  select p_to_day, s.position, s.pattern, s.muscle_group, s.block, s.label,
         s.default_exercise_id, s.target_sets, s.target_reps_min, s.target_reps_max,
         s.target_weight_kg, s.superset_group, s.tempo, s.rest_seconds, s.note
    from plan_slots s
   where s.plan_day_id = p_from_day;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function copy_plan_slots(uuid, uuid) from public, anon;
grant execute on function copy_plan_slots(uuid, uuid) to authenticated;

-- ---------- assign_template (wie 0028, mit Startgewicht) ----------

create or replace function assign_template(
  p_template  uuid,
  p_client    uuid,
  p_starts_on date default current_date,
  p_name      text default null
) returns uuid
language plpgsql security invoker
set search_path = public as $$
declare
  v_coach   uuid := auth.uid();
  v_tpl     templates%rowtype;
  v_plan    uuid;
  v_day     record;
  v_new_day uuid;
  v_soll_tage  int;
  v_soll_slots int;
  v_ist_tage   int;
  v_ist_slots  int;
begin
  if v_coach is null then
    raise exception 'Nicht angemeldet';
  end if;

  if not exists (
    select 1 from clients where id = p_client and coach_id = v_coach
  ) then
    raise exception 'Kein Zugriff auf diesen Klienten';
  end if;

  select * into v_tpl from templates where id = p_template;
  if not found then
    raise exception 'Programm nicht gefunden';
  end if;

  update plans set is_active = false
   where client_id = p_client and is_active;

  insert into plans (coach_id, client_id, template_id, name, level, starts_on, is_active)
  values (
    v_coach, p_client, v_tpl.id,
    coalesce(nullif(btrim(p_name), ''), v_tpl.name),
    v_tpl.level, p_starts_on, true
  )
  returning id into v_plan;

  for v_day in
    select * from plan_days where template_id = v_tpl.id order by position
  loop
    insert into plan_days (plan_id, position, title, is_guided, weekdays)
    values (v_plan, v_day.position, v_day.title, v_day.is_guided, v_day.weekdays)
    returning id into v_new_day;
    perform copy_plan_slots(v_day.id, v_new_day);
  end loop;

  -- Nachzählen (wie 0028; check_schema sucht nach dieser Zeile).
  select count(*) into v_soll_tage from plan_days where template_id = v_tpl.id;
  select count(*) into v_soll_slots
    from plan_slots s join plan_days d on d.id = s.plan_day_id
   where d.template_id = v_tpl.id;
  select count(*) into v_ist_tage from plan_days where plan_id = v_plan;
  select count(*) into v_ist_slots
    from plan_slots s join plan_days d on d.id = s.plan_day_id
   where d.plan_id = v_plan;

  if v_ist_tage <> v_soll_tage or v_ist_slots <> v_soll_slots then
    raise exception
      'Programm wurde nicht vollstaendig uebernommen (% von % Tagen, % von % Slots).',
      v_ist_tage, v_soll_tage, v_ist_slots, v_soll_slots;
  end if;

  return v_plan;
end;
$$;

revoke all on function assign_template(uuid, uuid, date, text) from public, anon;
grant execute on function assign_template(uuid, uuid, date, text) to authenticated;

-- ---------- copy_template (wie 0028, mit Startgewicht) ----------

create or replace function copy_template(
  p_template uuid,
  p_name     text default null
) returns uuid
language plpgsql security invoker
set search_path = public as $$
declare
  v_coach   uuid := auth.uid();
  v_tpl     templates%rowtype;
  v_copy    uuid;
  v_day     record;
  v_new_day uuid;
  v_soll    int;
  v_ist     int;
begin
  if v_coach is null then
    raise exception 'Nicht angemeldet';
  end if;

  select * into v_tpl from templates where id = p_template;
  if not found then
    raise exception 'Programm nicht gefunden';
  end if;

  insert into templates (coach_id, name, level, description, is_system)
  values (v_coach, coalesce(nullif(btrim(p_name), ''), v_tpl.name),
          v_tpl.level, v_tpl.description, false)
  returning id into v_copy;

  for v_day in
    select * from plan_days where template_id = v_tpl.id order by position
  loop
    insert into plan_days (template_id, position, title, is_guided, weekdays)
    values (v_copy, v_day.position, v_day.title, v_day.is_guided, v_day.weekdays)
    returning id into v_new_day;
    perform copy_plan_slots(v_day.id, v_new_day);
  end loop;

  select count(*) into v_soll
    from plan_slots s join plan_days d on d.id = s.plan_day_id
   where d.template_id = v_tpl.id;
  select count(*) into v_ist
    from plan_slots s join plan_days d on d.id = s.plan_day_id
   where d.template_id = v_copy;
  if v_ist <> v_soll then
    raise exception
      'Programm wurde nicht vollstaendig kopiert (% von % Slots).', v_ist, v_soll;
  end if;

  return v_copy;
end;
$$;

revoke all on function copy_template(uuid, text) from public, anon;
grant execute on function copy_template(uuid, text) to authenticated;

-- ---------- B3: Plan eines Klienten als Programm ----------
--
-- Gleiche Bauart wie copy_template, nur mit einem Plan als Quelle. Der
-- Plan muss dem Aufrufer gehören — ein Athlet liest seinen Plan zwar,
-- soll daraus aber kein Programm im Konto seines Trainers anlegen.

create or replace function plan_to_template(
  p_plan uuid,
  p_name text default null
) returns uuid
language plpgsql security invoker
set search_path = public as $$
declare
  v_coach   uuid := auth.uid();
  v_plan    plans%rowtype;
  v_copy    uuid;
  v_day     record;
  v_new_day uuid;
  v_soll_tage  int;
  v_soll_slots int;
  v_ist_tage   int;
  v_ist_slots  int;
begin
  if v_coach is null then
    raise exception 'Nicht angemeldet';
  end if;

  select * into v_plan from plans where id = p_plan and coach_id = v_coach;
  if not found then
    raise exception 'Plan nicht gefunden';
  end if;

  insert into templates (coach_id, name, level, description, is_system)
  values (v_coach, coalesce(nullif(btrim(p_name), ''), v_plan.name),
          v_plan.level, null, false)
  returning id into v_copy;

  for v_day in
    select * from plan_days where plan_id = v_plan.id order by position
  loop
    insert into plan_days (template_id, position, title, is_guided, weekdays)
    values (v_copy, v_day.position, v_day.title, v_day.is_guided, v_day.weekdays)
    returning id into v_new_day;
    perform copy_plan_slots(v_day.id, v_new_day);
  end loop;

  select count(*) into v_soll_tage from plan_days where plan_id = v_plan.id;
  select count(*) into v_soll_slots
    from plan_slots s join plan_days d on d.id = s.plan_day_id
   where d.plan_id = v_plan.id;
  select count(*) into v_ist_tage from plan_days where template_id = v_copy;
  select count(*) into v_ist_slots
    from plan_slots s join plan_days d on d.id = s.plan_day_id
   where d.template_id = v_copy;

  if v_ist_tage <> v_soll_tage or v_ist_slots <> v_soll_slots then
    raise exception
      'Programm wurde nicht vollstaendig kopiert (% von % Tagen, % von % Slots).',
      v_ist_tage, v_soll_tage, v_ist_slots, v_soll_slots;
  end if;

  return v_copy;
end;
$$;

revoke all on function plan_to_template(uuid, text) from public, anon;
grant execute on function plan_to_template(uuid, text) to authenticated;

-- ---------- B7: Notizen je Klient und Übung ----------
--
-- Eine Notiz je Klient und Übung, überschreibbar. Leeren = löschen
-- (macht die App), nicht eine leere Zeile stehen lassen.
--
-- Nur der Trainer des Klienten liest und schreibt. coach_id steht mit
-- drin, damit eine Notiz beim Trainerwechsel nicht beim neuen Trainer
-- auftaucht: Sie war die Beobachtung eines bestimmten Menschen.

create table if not exists client_exercise_notes (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  coach_id    uuid not null default auth.uid()
              references coaches(id) on delete cascade,
  note        text not null,
  updated_at  timestamptz not null default now(),
  constraint client_exercise_notes_laenge
    check (char_length(btrim(note)) between 1 and 500),
  constraint client_exercise_notes_einmal unique (client_id, exercise_id, coach_id)
);

alter table client_exercise_notes enable row level security;

drop policy if exists client_exercise_notes_coach on client_exercise_notes;
create policy client_exercise_notes_coach on client_exercise_notes
  for all
  using (
    coach_id = auth.uid()
    and exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  )
  with check (
    coach_id = auth.uid()
    and exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  );

-- Der Zeitstempel kommt von der Datenbank, nicht vom Browser.
create or replace function client_exercise_notes_touch()
returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists client_exercise_notes_touch on client_exercise_notes;
create trigger client_exercise_notes_touch
  before insert or update on client_exercise_notes
  for each row execute function client_exercise_notes_touch();

comment on table client_exercise_notes is
  'Trainer-Notiz je Klient und Übung, steht beim Tracken oben (0031).';

-- ---------- Nachsehen statt hoffen ----------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_name = 'plan_slots' and column_name = 'target_weight_kg'
  ) then
    raise exception '0031: plan_slots.target_weight_kg fehlt.';
  end if;
  if (select prosrc from pg_proc where proname = 'assign_template') not like '%copy_plan_slots%'
     or (select prosrc from pg_proc where proname = 'copy_template') not like '%copy_plan_slots%' then
    raise exception '0031: Kopierfunktionen nehmen das Startgewicht nicht mit.';
  end if;
  if has_function_privilege('anon', 'plan_to_template(uuid, text)', 'execute')
     or has_function_privilege('anon', 'copy_plan_slots(uuid, uuid)', 'execute') then
    raise exception '0031: neue Funktionen sind fuer anon aufrufbar.';
  end if;
  if not (select relrowsecurity from pg_class where relname = 'client_exercise_notes') then
    raise exception '0031: client_exercise_notes ohne Zeilensicherheit.';
  end if;
end;
$$;
