-- ============================================================
-- 0028 — Programme: Vorlagen aus der App und eigene
-- ============================================================
--
-- Der Bereich „Training" hat zwei Reiter: Übungen und Programme. Ein
-- Programm ist ein Plan ohne Klienten — Tage und Slots, die man einem
-- oder vielen Klienten zuweisen kann.
--
-- DIE TABELLEN GIBT ES SEIT 0001
-- ------------------------------
-- `templates` und `plan_days.template_id` stehen seit dem ersten Schema
-- da, samt Regeln in 0002: System-Vorlagen (is_system) liest jeder
-- Trainer, eigene liest und schreibt nur ihr Besitzer, System-Vorlagen
-- schreibt niemand über die App. Diese Migration füllt sie nur mit
-- Leben.
--
-- ZWEI FUNKTIONEN
-- ---------------
-- assign_template  — kopiert ein Programm als neuen, aktiven Plan zu
--                    einem Klienten. Der bisher aktive wird stillgelegt.
-- copy_template    — kopiert ein Programm (meist eine App-Vorlage) als
--                    eigenes, bearbeitbares Programm.
--
-- Beide laufen mit den Rechten des Aufrufers (security invoker): Die
-- Zeilensicherheit entscheidet, was gelesen und geschrieben werden darf,
-- nicht die Funktion. Eine security-definer-Funktion müsste jede
-- Prüfung selbst nachbauen — und `auth.uid()` liest dort trotzdem den
-- Aufrufer (PROJEKTSTAND.md, Abschnitt 3).
--
-- NACHSEHEN STATT HOFFEN
-- ----------------------
-- Ein `insert ... select`, dessen Quelle die Zeilensicherheit leer
-- filtert, kopiert null Zeilen und meldet Erfolg. Am Ende jeder
-- Funktion steht deshalb ein Zählvergleich zwischen Quelle und Kopie —
-- weichen sie ab, bricht sie ab und die ganze Kopie wird zurückgerollt.

-- ---------- Programm einem Klienten zuweisen ----------

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

  -- Wie beim Anlegen von Hand: Ein Klient hat genau einen aktiven Plan,
  -- sonst wüsste die Athleten-App nicht, welchem sie folgen soll.
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

    insert into plan_slots (
      plan_day_id, position, pattern, muscle_group, block, label,
      default_exercise_id, target_sets, target_reps_min, target_reps_max,
      superset_group, tempo, rest_seconds, note
    )
    select v_new_day, s.position, s.pattern, s.muscle_group, s.block, s.label,
           s.default_exercise_id, s.target_sets, s.target_reps_min, s.target_reps_max,
           s.superset_group, s.tempo, s.rest_seconds, s.note
      from plan_slots s
     where s.plan_day_id = v_day.id;
  end loop;

  -- Nachzählen.
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

-- ---------- Programm als eigenes kopieren ----------

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

    insert into plan_slots (
      plan_day_id, position, pattern, muscle_group, block, label,
      default_exercise_id, target_sets, target_reps_min, target_reps_max,
      superset_group, tempo, rest_seconds, note
    )
    select v_new_day, s.position, s.pattern, s.muscle_group, s.block, s.label,
           s.default_exercise_id, s.target_sets, s.target_reps_min, s.target_reps_max,
           s.superset_group, s.tempo, s.rest_seconds, s.note
      from plan_slots s
     where s.plan_day_id = v_day.id;
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

-- ---------- Vorlagen aus der App ----------
--
-- Drei Klassiker als Startpunkt, englisch benannt wie die Bibliothek.
-- Fachlich von mir zusammengestellt — Joël sollte drüberschauen und
-- ergänzen. Feste IDs, damit ein zweites Einspielen nichts doppelt
-- anlegt: Gibt es eine Vorlage schon, bleibt sie, wie sie ist.

create or replace function pg_temp.vorlage_slot(
  p_day uuid, p_pos int, p_ex text, p_sets int, p_min int, p_max int, p_rest int
) returns void language sql as $$
  insert into plan_slots (
    plan_day_id, position, pattern, muscle_group, block, label,
    default_exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds
  )
  select p_day, p_pos, e.pattern, e.muscle_group, e.default_block,
         coalesce(e.name_en, e.name), e.id, p_sets, p_min, p_max, p_rest
    from exercises e
   where e.id = ('11111111-0000-4000-8000-00000000' || p_ex)::uuid;
$$;

do $$
declare
  v_tpl uuid;
  v_day uuid;
begin
  -- Full Body 2× ------------------------------------------------
  v_tpl := '22222222-0000-4000-8000-000000000001';
  if not exists (select 1 from templates where id = v_tpl) then
    insert into templates (id, coach_id, name, level, description, is_system)
    values (v_tpl, null, 'Full Body 2×', 'beginner',
            'Two full-body sessions per week — the classic start.', true);

    insert into plan_days (template_id, position, title) values (v_tpl, 1, 'Day A — Full Body')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0021', 3, 6, 8, 120);   -- Back Squat
    perform pg_temp.vorlage_slot(v_day, 2, '0100', 3, 8, 10, 90);   -- DB Bench
    perform pg_temp.vorlage_slot(v_day, 3, '0113', 3, 10, 12, 90);  -- Cable Row
    perform pg_temp.vorlage_slot(v_day, 4, '0031', 3, 8, 10, 90);   -- RDL
    perform pg_temp.vorlage_slot(v_day, 5, '0043', 2, 12, 15, 60);  -- Lateral Raise
    perform pg_temp.vorlage_slot(v_day, 6, '0147', 3, 30, 45, 45);  -- Plank

    insert into plan_days (template_id, position, title) values (v_tpl, 2, 'Day B — Full Body')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0126', 3, 8, 12, 120);  -- Leg Press
    perform pg_temp.vorlage_slot(v_day, 2, '0003', 3, 8, 10, 90);   -- Incline DB Press
    perform pg_temp.vorlage_slot(v_day, 3, '0112', 3, 10, 12, 90);  -- Lat Pulldown
    perform pg_temp.vorlage_slot(v_day, 4, '0033', 3, 10, 12, 90);  -- Hip Thrust
    perform pg_temp.vorlage_slot(v_day, 5, '0014', 2, 12, 15, 60);  -- Face Pulls
    perform pg_temp.vorlage_slot(v_day, 6, '0156', 3, 10, 12, 45);  -- Dead Bug
  end if;

  -- Upper / Lower -----------------------------------------------
  v_tpl := '22222222-0000-4000-8000-000000000002';
  if not exists (select 1 from templates where id = v_tpl) then
    insert into templates (id, coach_id, name, level, description, is_system)
    values (v_tpl, null, 'Upper / Lower', 'intermediate',
            'Upper and lower body split, three to four sessions per week.', true);

    insert into plan_days (template_id, position, title) values (v_tpl, 1, 'Day A — Upper Body')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0001', 4, 5, 8, 150);   -- Bench
    perform pg_temp.vorlage_slot(v_day, 2, '0013', 4, 6, 10, 120);  -- Barbell Row
    perform pg_temp.vorlage_slot(v_day, 3, '0142', 3, 8, 10, 90);   -- DB Shoulder Press
    perform pg_temp.vorlage_slot(v_day, 4, '0112', 3, 10, 12, 90);  -- Lat Pulldown
    perform pg_temp.vorlage_slot(v_day, 5, '0108', 3, 10, 15, 60);  -- Triceps Pushdown
    perform pg_temp.vorlage_slot(v_day, 6, '0119', 3, 10, 12, 60);  -- DB Curl

    insert into plan_days (template_id, position, title) values (v_tpl, 2, 'Day B — Lower Body')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0021', 4, 5, 8, 150);   -- Back Squat
    perform pg_temp.vorlage_slot(v_day, 2, '0031', 3, 8, 10, 120);  -- RDL
    perform pg_temp.vorlage_slot(v_day, 3, '0128', 3, 8, 10, 90);   -- Bulgarian Split Squat
    perform pg_temp.vorlage_slot(v_day, 4, '0137', 3, 10, 12, 60);  -- Lying Leg Curl
    perform pg_temp.vorlage_slot(v_day, 5, '0131', 3, 12, 15, 60);  -- Standing Calf Raise
    perform pg_temp.vorlage_slot(v_day, 6, '0152', 3, 10, 15, 60);  -- Hanging Leg Raise
  end if;

  -- Push / Pull / Legs ------------------------------------------
  v_tpl := '22222222-0000-4000-8000-000000000003';
  if not exists (select 1 from templates where id = v_tpl) then
    insert into templates (id, coach_id, name, level, description, is_system)
    values (v_tpl, null, 'Push / Pull / Legs', 'intermediate',
            'Pushing, pulling and legs on separate days, three to six sessions per week.', true);

    insert into plan_days (template_id, position, title) values (v_tpl, 1, 'Day A — Push')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0001', 4, 5, 8, 150);   -- Bench
    perform pg_temp.vorlage_slot(v_day, 2, '0003', 3, 8, 10, 90);   -- Incline DB Press
    perform pg_temp.vorlage_slot(v_day, 3, '0141', 3, 6, 8, 120);   -- Overhead Press
    perform pg_temp.vorlage_slot(v_day, 4, '0043', 3, 12, 15, 60);  -- Lateral Raise
    perform pg_temp.vorlage_slot(v_day, 5, '0108', 3, 10, 15, 60);  -- Triceps Pushdown

    insert into plan_days (template_id, position, title) values (v_tpl, 2, 'Day B — Pull')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0011', 4, 6, 10, 120);  -- Pull-Ups
    perform pg_temp.vorlage_slot(v_day, 2, '0013', 3, 6, 10, 120);  -- Barbell Row
    perform pg_temp.vorlage_slot(v_day, 3, '0113', 3, 10, 12, 90);  -- Cable Row
    perform pg_temp.vorlage_slot(v_day, 4, '0014', 3, 12, 15, 60);  -- Face Pulls
    perform pg_temp.vorlage_slot(v_day, 5, '0120', 3, 10, 12, 60);  -- Hammer Curls

    insert into plan_days (template_id, position, title) values (v_tpl, 3, 'Day C — Legs')
    returning id into v_day;
    perform pg_temp.vorlage_slot(v_day, 1, '0021', 4, 5, 8, 150);   -- Back Squat
    perform pg_temp.vorlage_slot(v_day, 2, '0031', 3, 8, 10, 120);  -- RDL
    perform pg_temp.vorlage_slot(v_day, 3, '0126', 3, 10, 12, 90);  -- Leg Press
    perform pg_temp.vorlage_slot(v_day, 4, '0138', 3, 10, 12, 60);  -- Seated Leg Curl
    perform pg_temp.vorlage_slot(v_day, 5, '0131', 3, 12, 15, 60);  -- Standing Calf Raise
  end if;

  -- Nachsehen: Jede Vorlage hat Tage, und jeder Tag hat Slots. Ein
  -- falscher Übungs-Schlüssel oben fügte still null Slots ein.
  if exists (
    select 1 from plan_days d
     where d.template_id in (
             '22222222-0000-4000-8000-000000000001',
             '22222222-0000-4000-8000-000000000002',
             '22222222-0000-4000-8000-000000000003')
       and not exists (select 1 from plan_slots s where s.plan_day_id = d.id)
  ) then
    raise exception '0028: Ein Vorlagentag ist leer — Uebungs-IDs pruefen.';
  end if;

  if (select count(*) from plan_slots s join plan_days d on d.id = s.plan_day_id
       where d.template_id in (
             '22222222-0000-4000-8000-000000000001',
             '22222222-0000-4000-8000-000000000002',
             '22222222-0000-4000-8000-000000000003')) <> 39 then
    raise exception '0028: Die Vorlagen haben nicht 39 Slots — Uebungs-IDs pruefen.';
  end if;
end;
$$;
