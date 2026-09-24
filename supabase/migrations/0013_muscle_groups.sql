-- ============================================================
-- 0013 — Muskelgruppen
-- ============================================================
--
-- Aus dem Meeting mit Joel: Trainer denken in Muskelgruppen, nicht in
-- Bewegungsmustern. „Heute Brust und Trizeps" ist der Satz, der im Studio
-- faellt — „heute Druecken" sagt niemand.
--
-- Die Muskelgruppe kommt DAZU, das Muster bleibt. Zwei Gruende:
--
-- 1. Das Muster haelt den Slot zusammen, wenn die Uebung getauscht wird.
--    Tauscht der Athlet Bankdruecken gegen die Brustpresse, ist das
--    dieselbe Aufgabe im Plan — sichtbar wird das ueber das Muster, nicht
--    ueber die Uebung. Ohne Muster zerfaellt die Historie am Tausch.
--
-- 2. Die beiden beantworten verschiedene Fragen. „Druecken" und „Brust"
--    sind nicht dasselbe: Enge Liegestuetze sind Druecken, trainieren
--    aber den Trizeps. Genau diese Unterscheidung will Joel — sie ginge
--    verloren, wenn man die Gruppe aus dem Muster ableitet, statt sie
--    einzeln zu pflegen.
--
-- Sichtbar ist ab jetzt die Muskelgruppe. Das Muster arbeitet darunter
-- weiter.
--
-- Zehn Gruppen, Beine aufgeteilt in Quadrizeps, Beinbeuger, Waden und
-- Gesaess. Weniger waere im Studio zu grob: „Beine" trifft auf
-- Beinstrecker und Wadenheben gleichermassen zu und sagt damit nichts.

set search_path = public;

-- ------------------------------------------------------------
-- Typ und Spalten
-- ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'muscle_group') then
    create type muscle_group as enum (
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'quads',
      'hamstrings',
      'calves',
      'glutes',
      'core'
    );
  end if;
end $$;

-- Auf der Uebung: die fachliche Wahrheit, gehoert zur Uebung selbst.
alter table exercises     add column if not exists muscle_group muscle_group;

-- Auf dem Slot: was der Trainer fuer diesen Platz vorgibt. Optional,
-- genau wie das Muster — ein Slot darf offen bleiben.
alter table plan_slots    add column if not exists muscle_group muscle_group;

-- In der Historie: womit der Satz tatsaechlich verbucht wurde. Ohne das
-- wuerde eine spaetere Umsortierung der Bibliothek alte Einheiten
-- rueckwirkend umschreiben.
alter table session_slots add column if not exists muscle_group muscle_group;

-- ------------------------------------------------------------
-- Zuordnung der mitgelieferten Uebungen
-- ------------------------------------------------------------
--
-- Von Hand, Zeile fuer Zeile — nicht aus dem Muster abgeleitet. Joel
-- liest die Liste gegen; strittig sind vor allem Face Pulls, Reverse
-- Flys, Shrugs, Kreuzheben und der Kettlebell Swing.
--
-- Nur `coach_id is null`: Eigene Uebungen der Trainer bleiben unberuehrt.

-- Brust (11)
update exercises set muscle_group = 'chest'
 where coach_id is null and name in (
    'Bankdrücken (Kurzhantel)',
    'Bankdrücken (Langhantel)',
    'Brustpresse (Maschine)',
    'Butterfly (Maschine)',
    'Dips (Brustversion)',
    'Kabelzug-Fliegende',
    'Kurzhantel-Fliegende',
    'Liegestütze',
    'Liegestütze erhöht',
    'Negativbankdrücken',
    'Schrägbankdrücken (Kurzhantel, 30 Grad)'
  );

-- Rücken (12)
update exercises set muscle_group = 'back'
 where coach_id is null and name in (
    'Inverted Row',
    'Klimmzüge',
    'Klimmzüge mit Band',
    'Kreuzheben (konventionell)',
    'Kurzhantelrudern (einarmig)',
    'Langhantelrudern',
    'Latzug',
    'Nackenheben (Shrugs)',
    'Rudern (Maschine)',
    'Rudern am Kabel (sitzend)',
    'Rückenstrecker (Hyperextension)',
    'T-Bar-Rudern'
  );

-- Schultern (11)
update exercises set muscle_group = 'shoulders'
 where coach_id is null and name in (
    'Arnold Press',
    'Aufrechtes Rudern',
    'Face Pulls',
    'Frontheben',
    'Landmine Press',
    'Push Press',
    'Reverse Flys',
    'Schulterdrücken (Kurzhantel)',
    'Schulterdrücken (Langhantel)',
    'Schulterpresse (Maschine)',
    'Seitheben'
  );

-- Bizeps (5)
update exercises set muscle_group = 'biceps'
 where coach_id is null and name in (
    'Bizeps-Curls (Kurzhantel)',
    'Bizeps-Curls (Langhantel)',
    'Hammer-Curls',
    'Kabel-Curls',
    'Scott-Curls'
  );

-- Trizeps (5)
update exercises set muscle_group = 'triceps'
 where coach_id is null and name in (
    'Enge Liegestütze',
    'Skull Crusher',
    'Trizeps-Dips an der Bank',
    'Trizeps-Überkopfdrücken',
    'Trizepsdrücken am Kabel'
  );

-- Quadrizeps (9)
update exercises set muscle_group = 'quads'
 where coach_id is null and name in (
    'Ausfallschritte gehend',
    'Beinpresse',
    'Beinstrecker',
    'Bulgarian Split Squat',
    'Frontkniebeuge',
    'Goblet Squat',
    'Hackenschmidt-Kniebeuge',
    'Kniebeuge (Langhantel)',
    'Step-Ups'
  );

-- Beinbeuger (5)
update exercises set muscle_group = 'hamstrings'
 where coach_id is null and name in (
    'Beinbeuger (liegend)',
    'Beinbeuger (sitzend)',
    'Good Mornings',
    'Nordic Curls',
    'Rumänisches Kreuzheben'
  );

-- Waden (2)
update exercises set muscle_group = 'calves'
 where coach_id is null and name in (
    'Wadenheben (sitzend)',
    'Wadenheben (stehend)'
  );

-- Gesäß (4)
update exercises set muscle_group = 'glutes'
 where coach_id is null and name in (
    'Glute Kickback (Kabel)',
    'Hip Thrust',
    'Kettlebell Swing',
    'Sumo-Kreuzheben'
  );

-- Rumpf (12)
update exercises set muscle_group = 'core'
 where coach_id is null and name in (
    'Ab Wheel',
    'Bird Dog',
    'Crunch',
    'Dead Bug',
    'Farmers Walk',
    'Hollow Hold',
    'Hängendes Beinheben',
    'Kabel-Crunch',
    'Pallof Press',
    'Plank',
    'Russian Twist',
    'Seitstütz'
  );

-- ------------------------------------------------------------
-- Pflicht, sobald alles zugeordnet ist
-- ------------------------------------------------------------
--
-- Bricht das hier ab, ist eine Uebung durchgerutscht — dann sagt die
-- Meldung, welche. Das ist gewollt: Eine stille Luecke in der Bibliothek
-- faellt sonst erst im Studio auf, wenn eine Uebung nirgends erscheint.

do $$
declare
  offen text;
begin
  select string_agg(name, ', ') into offen
    from exercises where coach_id is null and muscle_group is null;
  if offen is not null then
    raise exception 'Ohne Muskelgruppe: %', offen;
  end if;
end $$;

-- Eigene Uebungen der Trainer grob ueber das Muster einsortieren. Grob
-- ist hier richtig: Der Trainer korrigiert das mit einem Klick, eine
-- leere Spalte koennte er nicht korrigieren — die Uebung taucht dann in
-- keiner Gruppe auf.
update exercises set muscle_group = case
    when default_block = 'core' then 'core'
    when pattern = 'push'     then 'chest'
    when pattern = 'pull'     then 'back'
    when pattern = 'overhead' then 'shoulders'
    when pattern = 'squat'    then 'quads'
    when pattern = 'hinge'    then 'hamstrings'
    else 'core'
  end::muscle_group
 where coach_id is not null and muscle_group is null;

alter table exercises alter column muscle_group set not null;

create index if not exists exercises_muscle_group_idx
  on exercises (muscle_group);

comment on column exercises.muscle_group is
  'Trainierte Hauptmuskelgruppe. Sichtbar in der Oberflaeche; das '
  'Bewegungsmuster arbeitet darunter weiter und traegt die Kontinuitaet '
  'beim Uebungstausch.';
comment on column plan_slots.muscle_group is
  'Vorgabe des Trainers fuer diesen Platz. Null = offen.';
comment on column session_slots.muscle_group is
  'Womit der Satz verbucht wurde — festgehalten, damit spaetere '
  'Aenderungen an der Bibliothek die Historie nicht umschreiben.';
