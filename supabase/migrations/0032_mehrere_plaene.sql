-- ============================================================
-- 0032 — Mehrere aktive Pläne je Klient
-- ============================================================
--
-- Meeting 27.10.2026: Ein Klient hat oft zwei Pläne gleichzeitig, z. B.
-- einen für die Einheiten mit Trainer und einen für allein. Bisher hielt
-- die App genau einen aktiv: Zuweisen und Anlegen legten den alten still.
--
-- Die Tabelle konnte das schon immer (kein Unique-Index auf is_active).
-- Nur assign_template (0028/0031) schaltet die anderen Pläne ab. Hier
-- bekommt es einen fünften Parameter:
--
--   p_ersetzen = true   wie bisher, die anderen aktiven Pläne werden
--                       stillgelegt (Standard, damit alte Aufrufe gleich
--                       bleiben)
--   p_ersetzen = false  der neue Plan kommt daneben
--
-- Die alte Fassung mit vier Parametern wird entfernt. Blieben beide
-- stehen, fände PostgREST bei einem Aufruf mit vier Namen zwei passende
-- Funktionen und lehnte ab.
--
-- Stillgelegte Pläne bleiben, wie sie sind: lesbar und startbar, nur
-- nicht mehr vorgeschlagen. Das regelt die App, nicht die Datenbank.

drop function if exists assign_template(uuid, uuid, date, text);

create or replace function assign_template(
  p_template  uuid,
  p_client    uuid,
  p_starts_on date default current_date,
  p_name      text default null,
  p_ersetzen  boolean default true
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

  if p_ersetzen then
    update plans set is_active = false
     where client_id = p_client and is_active;
  end if;

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

revoke all on function assign_template(uuid, uuid, date, text, boolean) from public, anon;
grant execute on function assign_template(uuid, uuid, date, text, boolean) to authenticated;

do $$
begin
  if (select count(*) from pg_proc where proname = 'assign_template') <> 1 then
    raise exception '0032: assign_template gibt es nicht genau einmal.';
  end if;
  if has_function_privilege('anon', 'assign_template(uuid, uuid, date, text, boolean)', 'execute') then
    raise exception '0032: assign_template ist fuer anon aufrufbar.';
  end if;
  if (select prosrc from pg_proc where proname = 'assign_template') not like '%copy_plan_slots%' then
    raise exception '0032: assign_template nimmt das Startgewicht nicht mehr mit.';
  end if;
end;
$$;
