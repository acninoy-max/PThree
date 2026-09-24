-- =====================================================================
-- PT FIVE — Registrierung und Demo-Daten
--
-- Teil 1: Wer sich registriert, bekommt automatisch Profil und Coach-Eintrag.
-- Teil 2: Globale Übungsbibliothek (aus Joëls Buch).
-- Teil 3: Funktion, die einem Coach Demo-Klienten mit Historie anlegt.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. Registrierung
-- ---------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  wanted_role user_role;
begin
  -- Rolle kommt aus den Metadaten der Registrierung, Standard ist Coach.
  wanted_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::user_role,
    'coach'
  );

  insert into profiles (id, role, full_name, email)
  values (
    new.id,
    wanted_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  if wanted_role = 'coach' then
    insert into coaches (id, display_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------
-- 2. Globale Übungsbibliothek
--    coach_id bleibt null — für alle lesbar, für niemanden änderbar.
-- ---------------------------------------------------------------

insert into exercises (id, coach_id, name, pattern, default_block, cue, common_fault, is_bodyweight)
values
  -- Drücken
  ('11111111-0000-4000-8000-000000000001', null, 'Bankdrücken (Langhantel)', 'push', 'compound',
   'Brust raus, Schultern zurück und unten.',
   'Ellenbogen weichen auf 90 Grad aus — leicht anlegen schont die Schulter.', false),
  ('11111111-0000-4000-8000-000000000002', null, 'Liegestütze', 'push', 'functional',
   'Schultern zurück, Brust dicht zum Boden, kontrolliert drücken.',
   'Hüfte hängt durch — Rumpf spannen, gerade Linie halten.', true),
  ('11111111-0000-4000-8000-000000000003', null, 'Schrägbankdrücken (Kurzhantel, 30 Grad)', 'push', 'compound',
   'Obere Brust und Schultern, Dehnung kontrollieren.', null, false),
  ('11111111-0000-4000-8000-000000000004', null, 'Kurzhantel-Fliegende', 'push', 'isolation',
   'Brust isolieren — dehnen und zusammenführen.', null, false),

  -- Ziehen
  ('11111111-0000-4000-8000-000000000011', null, 'Klimmzüge', 'pull', 'compound',
   'Aus den Ellenbogen ziehen, nicht aus den Armen.',
   'Bizeps reißt zuerst — Bewegung aus dem Latissimus einleiten.', true),
  ('11111111-0000-4000-8000-000000000012', null, 'Klimmzüge mit Band', 'pull', 'compound',
   'Gleiche Bahn wie streng, das Band nimmt Last ab.', null, true),
  ('11111111-0000-4000-8000-000000000013', null, 'Langhantelrudern', 'pull', 'functional',
   'Oberer Rücken und hintere Schulter, zu den unteren Rippen ziehen.', null, false),
  ('11111111-0000-4000-8000-000000000014', null, 'Face Pulls', 'pull', 'isolation',
   'Hintere Schulter, Haltung, Schultergesundheit.', null, false),

  -- Unterkörper drücken
  ('11111111-0000-4000-8000-000000000021', null, 'Kniebeuge (Langhantel)', 'squat', 'compound',
   'Aufrecht, Knie nach vorn, über die Fersen hochdrücken.',
   'Fersen heben sich, Knie fallen nach innen — den Boden auseinanderdrücken.', false),
  ('11111111-0000-4000-8000-000000000022', null, 'Goblet Squat', 'squat', 'compound',
   'Oberkörper aufrecht, Knie über den Zehen.', null, false),
  ('11111111-0000-4000-8000-000000000023', null, 'Ausfallschritte gehend', 'squat', 'functional',
   'Lange kontrollierte Schritte.', null, false),

  -- Hüftbeuge
  ('11111111-0000-4000-8000-000000000031', null, 'Rumänisches Kreuzheben', 'hinge', 'compound',
   'Hüfte nach hinten schieben, statt das Gewicht hochzuziehen.',
   'Rücken rundet — aus der Hüfte beugen, Rippen unten halten.', false),
  ('11111111-0000-4000-8000-000000000032', null, 'Kettlebell Swing', 'hinge', 'functional',
   'Hüfte schnappt, die Arme schwingen nur mit.', null, false),
  ('11111111-0000-4000-8000-000000000033', null, 'Hip Thrust', 'hinge', 'isolation',
   'Gesäß drücken, Rippen unten, Kinn angelegt.', null, false),

  -- Über Kopf
  ('11111111-0000-4000-8000-000000000041', null, 'Arnold Press', 'overhead', 'functional',
   'Fester Stand, Gewicht direkt über dem Kopf stapeln.',
   'Fehlende Rumpfspannung drückt ins Kreuz — vor jeder Wiederholung in den Bauch atmen.', false),
  ('11111111-0000-4000-8000-000000000042', null, 'Aufrechtes Rudern', 'overhead', 'compound',
   'Vordere und seitliche Schulter, Trizeps, Rumpf.', null, false),
  ('11111111-0000-4000-8000-000000000043', null, 'Seitheben', 'overhead', 'isolation',
   'Seitliche Schulter, aus den Ellenbogen führen, kein Schwung.', null, false)
on conflict (id) do nothing;

-- Try-This-Leiter: leichtere und schwerere Varianten desselben Musters.
update exercises set regression_of_id = '11111111-0000-4000-8000-000000000011'
  where id = '11111111-0000-4000-8000-000000000012';
update exercises set regression_of_id = '11111111-0000-4000-8000-000000000021'
  where id = '11111111-0000-4000-8000-000000000022';

-- ---------------------------------------------------------------
-- 3. Demo-Daten
--    Nach der Registrierung einmal aufrufen:
--      select seed_demo_data('deine@mail.de');
--    Die Historie ist so gebaut, dass die Coach-Engine anschlägt:
--    Drücken stagniert, Ziehen ist inaktiv, Beine wachsen.
-- ---------------------------------------------------------------

create or replace function seed_demo_data(coach_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_coach   uuid;
  v_org     uuid;
  v_lisa    uuid;
  v_mark    uuid;
  v_sanne   uuid;
  v_session uuid;
  v_slot    uuid;
  i         int;
  w         numeric;
begin
  select id into v_coach from profiles where email = coach_email and role = 'coach';
  if v_coach is null then
    return 'Kein Coach mit dieser E-Mail gefunden. Erst in der App registrieren.';
  end if;

  -- Kette anlegen und Coach zuordnen
  insert into organisations (name, slug)
  values ('Trainmore', 'trainmore')
  on conflict (slug) do update set name = excluded.name
  returning id into v_org;

  update coaches set organisation_id = v_org where id = v_coach;

  -- Klienten
  insert into clients (coach_id, organisation_id, full_name, email, level, goal, started_on)
  values (v_coach, v_org, 'Lisa Vermeer', 'lisa@example.com', 'intermediate',
          'Kraft aufbauen, Bankdrücken 80 kg', current_date - 120)
  returning id into v_lisa;

  insert into clients (coach_id, organisation_id, full_name, email, level, goal, started_on)
  values (v_coach, v_org, 'Mark Timmermans', 'mark@example.com', 'beginner',
          'Regelmäßig trainieren, Rücken stärken', current_date - 60)
  returning id into v_mark;

  insert into clients (coach_id, organisation_id, full_name, email, level, goal, started_on)
  values (v_coach, v_org, 'Sanne de Vries', 'sanne@example.com', 'pro',
          'Kreuzheben 120 kg', current_date - 200)
  returning id into v_sanne;

  -- Lisa: Bankdrücken steht seit drei Einheiten, Kniebeuge wächst.
  for i in 0..2 loop
    insert into sessions (client_id, coach_id, organisation_id, title, performed_at)
    values (v_lisa, v_coach, v_org, 'Ganzkörper',
            now() - ((21 - i * 7) || ' days')::interval)
    returning id into v_session;

    insert into session_slots (session_id, pattern, block, exercise_id, position)
    values (v_session, 'push', 'compound', '11111111-0000-4000-8000-000000000001', 1)
    returning id into v_slot;
    insert into session_sets (session_slot_id, set_number, weight_kg, reps)
    values (v_slot, 1, 72, 6), (v_slot, 2, 72, 6), (v_slot, 3, 67.5, 8);

    insert into session_slots (session_id, pattern, block, exercise_id, position)
    values (v_session, 'squat', 'compound', '11111111-0000-4000-8000-000000000021', 2)
    returning id into v_slot;
    w := 90 + i * 10;
    insert into session_sets (session_slot_id, set_number, weight_kg, reps)
    values (v_slot, 1, w, 6), (v_slot, 2, w, 6), (v_slot, 3, w - 10, 8);
  end loop;

  -- Mark: seit zwölf Tagen nichts geloggt.
  insert into sessions (client_id, coach_id, organisation_id, title, performed_at)
  values (v_mark, v_coach, v_org, 'Oberkörper', now() - interval '12 days')
  returning id into v_session;
  insert into session_slots (session_id, pattern, block, exercise_id, position)
  values (v_session, 'pull', 'compound', '11111111-0000-4000-8000-000000000011', 1)
  returning id into v_slot;
  insert into session_sets (session_slot_id, set_number, weight_kg, reps, is_bodyweight)
  values (v_slot, 1, 0, 9, true), (v_slot, 2, 0, 7, true);

  -- Sanne: Hüftbeuge geht deutlich nach oben.
  for i in 0..1 loop
    insert into sessions (client_id, coach_id, organisation_id, title, performed_at)
    values (v_sanne, v_coach, v_org, 'Rückseite',
            now() - ((16 - i * 11) || ' days')::interval)
    returning id into v_session;
    insert into session_slots (session_id, pattern, block, exercise_id, position)
    values (v_session, 'hinge', 'compound', '11111111-0000-4000-8000-000000000031', 1)
    returning id into v_slot;
    w := 80 + i * 15;
    insert into session_sets (session_slot_id, set_number, weight_kg, reps)
    values (v_slot, 1, w, 8), (v_slot, 2, w, 8);
  end loop;

  -- Termine der kommenden Tage
  insert into appointments (coach_id, client_id, organisation_id, starts_at, duration_minutes, location)
  values
    (v_coach, v_lisa,  v_org, date_trunc('day', now()) + interval '1 day 9 hours',  60, 'gym'),
    (v_coach, v_sanne, v_org, date_trunc('day', now()) + interval '1 day 11 hours', 60, 'gym'),
    (v_coach, v_mark,  v_org, date_trunc('day', now()) + interval '3 days 18 hours', 45, 'gym');

  -- Ein offenes Check-in von Lisa
  insert into check_ins (client_id, coach_id, week_of, submitted_at, weight_kg, energy, sleep, stress, client_note)
  values (v_lisa, v_coach, date_trunc('week', current_date)::date, now() - interval '1 day',
          64.2, 3, 3, 4, 'Bankdrücken fühlt sich zäh an, Beine laufen super.')
  on conflict (client_id, week_of) do nothing;

  return 'Demo-Daten angelegt: 3 Klienten, 6 Einheiten, 3 Termine, 1 Check-in.';
end;
$$;
