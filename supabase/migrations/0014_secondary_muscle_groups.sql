-- ============================================================
-- 0014 — Nebengruppen und Joels Korrekturen
-- ============================================================
--
-- Joel hat die Zuordnung gegengelesen. Zwei Dinge kamen zurueck.
--
-- Erstens Einzelkorrekturen: Langhantelrudern ist eine Verbunduebung,
-- Bulgarian Split Squats treffen eher das Gesaess als den Quadrizeps, die
-- Brustvariante der Dips heisst Gironda Dips, und die normale
-- Split-Squat-Variante fehlte in der Bibliothek.
--
-- Zweitens die eigentliche Frage: Bei strittigen Uebungen soll man sie in
-- MEHRERE Gruppen legen koennen, damit der Trainer sie dort findet, wo er
-- sie sucht. Joel schreibt das zu Shrugs und Kreuzheben ausdruecklich.
--
-- Umsetzung: eine HAUPTgruppe bleibt Pflicht, dazu kommt eine Liste von
-- NEBENgruppen. Bewusst nicht eine gleichrangige Liste:
--
--   * Die Suche wird breiter — eine Uebung erscheint unter jeder ihrer
--     Gruppen. Genau das wollte Joel.
--   * Die Auswertung bleibt eindeutig — ohne Hauptgruppe zaehlte
--     Bankdruecken spaeter in der Brust- UND in der Trizeps-Statistik,
--     und das Volumen waere doppelt gezaehlt.
--
-- Fuer Slots aendert sich nichts: Ein Platz im Plan traegt genau eine
-- Gruppe. Der Trainer sagt „hier Brust", nicht „hier Brust und Trizeps".

set search_path = public;

-- ------------------------------------------------------------
-- Spalte
-- ------------------------------------------------------------

alter table exercises
  add column if not exists secondary_muscle_groups muscle_group[];

-- ------------------------------------------------------------
-- Normalisierung
-- ------------------------------------------------------------
--
-- Sortiert, doppelfrei, und die Hauptgruppe fliegt raus: „Brust, auch
-- Brust" ist keine Information, wuerde aber jede Anzeige doppelt
-- beschriften. Leere Liste wird NULL, damit „keine Nebengruppe" genau
-- eine Schreibweise hat.

create or replace function normalize_exercise_muscle_groups()
returns trigger
language plpgsql
as $$
begin
  if new.secondary_muscle_groups is not null then
    select array_agg(distinct g order by g)
      into new.secondary_muscle_groups
      from unnest(new.secondary_muscle_groups) as g
     where g is distinct from new.muscle_group;
  end if;

  if new.secondary_muscle_groups is not null
     and cardinality(new.secondary_muscle_groups) = 0 then
    new.secondary_muscle_groups := null;
  end if;

  return new;
end;
$$;

drop trigger if exists exercises_normalize_muscle_groups on exercises;
create trigger exercises_normalize_muscle_groups
  before insert or update of secondary_muscle_groups, muscle_group on exercises
  for each row execute function normalize_exercise_muscle_groups();

-- Hoechstens neun: zehn Gruppen minus die Hauptgruppe. Wer alle neun
-- einträgt, hat die Idee verfehlt — aber verbieten muss man es nicht.
alter table exercises drop constraint if exists exercises_secondary_groups_range;
alter table exercises add constraint exercises_secondary_groups_range
  check (
    secondary_muscle_groups is null
    or cardinality(secondary_muscle_groups) between 1 and 9
  );

-- Suche ueber beide Felder: „zeig mir alles fuer Bizeps".
create index if not exists exercises_secondary_groups_idx
  on exercises using gin (secondary_muscle_groups);

-- ------------------------------------------------------------
-- Joels Einzelkorrekturen
-- ------------------------------------------------------------

-- „LH Rudern compound uebung in meinen augen, gerade wenn vorgebeugt ist"
update exercises set default_block = 'compound'
 where coach_id is null and name = 'Langhantelrudern';

-- „bulgarians seh ich mehr bei gesaess als bei quads"
update exercises set muscle_group = 'glutes'
 where coach_id is null and name = 'Bulgarian Split Squat';

-- „dips die brustversion heisst 'gironda dips'"
update exercises set name = 'Gironda Dips (Brustversion)'
 where coach_id is null and name = 'Dips (Brustversion)';

-- „du kannst hier normale split squats in der quad liste lassen" — die gab
-- es noch nicht. Eigene Uebung statt Variante der Bulgarians: anderer
-- Aufbau, andere Last, eigene Historie.
insert into exercises
  (id, coach_id, name, pattern, muscle_group, default_block, cue, setup, is_bodyweight)
values
  ('11111111-0000-4000-8000-000000000200', null, 'Split Squat (stationär)', 'squat', 'quads', 'compound',
   'Hinterer Fuß am Boden, Rumpf aufrecht — der vordere Oberschenkel arbeitet.',
   'Schrittstellung etwa eine Beinlänge, hintere Ferse angehoben.',
   false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Nebengruppen
-- ------------------------------------------------------------
--
-- Nur dort, wo ein Trainer die Uebung wirklich in zwei Listen sucht.
-- „Arbeitet irgendwie mit" reicht nicht — sonst steht am Ende jede Uebung
-- in sechs Gruppen und die Auswahl ist wieder nutzlos.

-- + back  (3)
update exercises set secondary_muscle_groups = array['back']::muscle_group[]
 where coach_id is null and name in (
    'Face Pulls',
    'Farmers Walk',
    'Reverse Flys'
  );

-- + biceps  (9)
update exercises set secondary_muscle_groups = array['biceps']::muscle_group[]
 where coach_id is null and name in (
    'Inverted Row',
    'Klimmzüge',
    'Klimmzüge mit Band',
    'Kurzhantelrudern (einarmig)',
    'Langhantelrudern',
    'Latzug',
    'Rudern (Maschine)',
    'Rudern am Kabel (sitzend)',
    'T-Bar-Rudern'
  );

-- + chest  (1)
update exercises set secondary_muscle_groups = array['chest']::muscle_group[]
 where coach_id is null and name in (
    'Enge Liegestütze'
  );

-- + glutes  (10)
update exercises set secondary_muscle_groups = array['glutes']::muscle_group[]
 where coach_id is null and name in (
    'Ausfallschritte gehend',
    'Beinpresse',
    'Frontkniebeuge',
    'Goblet Squat',
    'Good Mornings',
    'Hackenschmidt-Kniebeuge',
    'Kniebeuge (Langhantel)',
    'Rumänisches Kreuzheben',
    'Split Squat (stationär)',
    'Step-Ups'
  );

-- + hamstrings  (2)
update exercises set secondary_muscle_groups = array['hamstrings']::muscle_group[]
 where coach_id is null and name in (
    'Hip Thrust',
    'Kettlebell Swing'
  );

-- + quads  (1)
update exercises set secondary_muscle_groups = array['quads']::muscle_group[]
 where coach_id is null and name in (
    'Bulgarian Split Squat'
  );

-- + shoulders  (1)
update exercises set secondary_muscle_groups = array['shoulders']::muscle_group[]
 where coach_id is null and name in (
    'Nackenheben (Shrugs)'
  );

-- + triceps  (10)
update exercises set secondary_muscle_groups = array['triceps']::muscle_group[]
 where coach_id is null and name in (
    'Arnold Press',
    'Brustpresse (Maschine)',
    'Gironda Dips (Brustversion)',
    'Landmine Press',
    'Liegestütze erhöht',
    'Negativbankdrücken',
    'Push Press',
    'Schulterdrücken (Kurzhantel)',
    'Schulterdrücken (Langhantel)',
    'Schulterpresse (Maschine)'
  );

-- + back, quads  (1)
update exercises set secondary_muscle_groups = array['back','quads']::muscle_group[]
 where coach_id is null and name in (
    'Sumo-Kreuzheben'
  );

-- + core, triceps  (1)
update exercises set secondary_muscle_groups = array['core','triceps']::muscle_group[]
 where coach_id is null and name in (
    'Liegestütze'
  );

-- + glutes, hamstrings  (2)
update exercises set secondary_muscle_groups = array['glutes','hamstrings']::muscle_group[]
 where coach_id is null and name in (
    'Kreuzheben (konventionell)',
    'Rückenstrecker (Hyperextension)'
  );

-- + shoulders, triceps  (3)
update exercises set secondary_muscle_groups = array['shoulders','triceps']::muscle_group[]
 where coach_id is null and name in (
    'Bankdrücken (Kurzhantel)',
    'Bankdrücken (Langhantel)',
    'Schrägbankdrücken (Kurzhantel, 30 Grad)'
  );

-- ------------------------------------------------------------
-- Kontrolle
-- ------------------------------------------------------------

do $$
declare
  fehler text;
begin
  -- Haupt- und Nebengruppe duerfen sich nicht ueberschneiden. Der Trigger
  -- verhindert das; bricht es hier trotzdem, ist der Trigger nicht aktiv.
  select string_agg(name, ', ') into fehler
    from exercises
   where secondary_muscle_groups is not null
     and muscle_group = any(secondary_muscle_groups);
  if fehler is not null then
    raise exception 'Hauptgruppe steht auch als Nebengruppe: %', fehler;
  end if;

  select string_agg(name, ', ') into fehler
    from exercises where coach_id is null and muscle_group is null;
  if fehler is not null then
    raise exception 'Ohne Hauptgruppe: %', fehler;
  end if;
end $$;

comment on column exercises.secondary_muscle_groups is
  'Weitere Gruppen, unter denen die Uebung gefunden werden soll. '
  'Aufsteigend, doppelfrei, ohne die Hauptgruppe. Die Auswertung nutzt '
  'nur muscle_group, damit Volumen nicht doppelt zaehlt.';
