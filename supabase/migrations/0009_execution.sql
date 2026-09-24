-- ============================================================
-- 0009 — Ausfuehrung: Supersaetze, Tempo, Pause, RIR, Aufbau
-- ============================================================
--
-- Alles aus dem UP-Benchmark, was die Trainingsausfuehrung betrifft.
-- Die Oberflaeche baut darauf auf.

set search_path = public;

-- ------------------------------------------------------------
-- 1. Aufbau-Anweisung an der Uebung
--    Nicht zu verwechseln mit `cue` (Coaching-Ansage) oder
--    `common_fault` (typischer Fehler). `setup` beschreibt, wie das
--    Geraet eingestellt wird: Bankwinkel, Griffbreite, Standbreite.
--    Ohne das misst man Rauschen — eine Bank auf 30 statt 45 Grad
--    ist eine andere Uebung, aber dieselbe Zeile in der Historie.
-- ------------------------------------------------------------

alter table exercises add column if not exists setup text;

-- ------------------------------------------------------------
-- 2. Vorgaben am Plan-Slot
--    superset_group gibt es schon (Buchstabe: gleicher Buchstabe =
--    zusammen ausfuehren). Es fehlten Tempo und Satzpause.
-- ------------------------------------------------------------

alter table plan_slots add column if not exists tempo text;
alter table plan_slots add column if not exists rest_seconds int;

alter table plan_slots drop constraint if exists plan_slots_rest_sane;
alter table plan_slots add constraint plan_slots_rest_sane
  check (rest_seconds is null or (rest_seconds between 0 and 900));

-- Tempo als vier Ziffern, z. B. 3111: exzentrisch, Pause unten,
-- konzentrisch, Pause oben. 'X' steht fuer explosiv.
alter table plan_slots drop constraint if exists plan_slots_tempo_shape;
alter table plan_slots add constraint plan_slots_tempo_shape
  check (tempo is null or tempo ~ '^[0-9X]{4}$');

-- ------------------------------------------------------------
-- 3. Betreut oder allein
--    UP nennt das "together" und "by yourself". Fuer das
--    Trainmore-Modell ist die Unterscheidung zentral: betreute
--    Einheit plus Solotraining. Bisher stand das nur an der
--    durchgefuehrten Einheit, nicht im Plan.
-- ------------------------------------------------------------

alter table plan_days add column if not exists is_guided boolean not null default false;

-- ------------------------------------------------------------
-- 4. Dauer und Vollstaendigkeit der Einheit
--    "Unvollstaendig" und "nicht passiert" sind zwei verschiedene
--    Dinge. Fuer ein Werkzeug, das einer Kette Qualitaet nachweisen
--    soll, darf man das nicht vermischen.
-- ------------------------------------------------------------

alter table sessions add column if not exists duration_seconds int;
alter table sessions add column if not exists is_complete boolean not null default true;

alter table sessions drop constraint if exists sessions_duration_sane;
alter table sessions add constraint sessions_duration_sane
  check (duration_seconds is null or (duration_seconds between 0 and 43200));

-- ------------------------------------------------------------
-- 5. RIR statt RPE
--    "Reps in Reserve" — wie viele Wiederholungen waeren noch
--    gegangen. Fuer Klienten deutlich greifbarer als eine
--    1-bis-10-Skala. Die Spalte rpe war nie in Gebrauch.
-- ------------------------------------------------------------

alter table session_sets add column if not exists rir int;

alter table session_sets drop constraint if exists session_sets_rir_range;
alter table session_sets add constraint session_sets_rir_range
  check (rir is null or (rir between 0 and 10));

alter table session_sets drop column if exists rpe;

-- ------------------------------------------------------------
-- 6. Aufbau-Anweisungen fuer die Uebungen, bei denen die
--    Einstellung die Zahlen bestimmt.
-- ------------------------------------------------------------

update exercises e
set setup = v.setup
from (values
  ('Bankdrücken (Langhantel)', 'Langhantel · Flachbank · Obergriff · schulterbreit plus eine Handbreit'),
  ('Bankdrücken (Kurzhantel)', 'Kurzhanteln · Flachbank · neutraler bis Obergriff · Handgelenke gestapelt'),
  ('Schrägbankdrücken (Kurzhantel, 30 Grad)', 'Kurzhanteln · Bank auf 30 Grad · Obergriff · Schulterblätter fixiert'),
  ('Negativbankdrücken', 'Langhantel · Bank auf minus 15 Grad · Obergriff · schulterbreit'),
  ('Brustpresse (Maschine)', 'Maschine · Griffe auf Brustwarzenhöhe · Rücken an der Lehne · Füsse flach'),
  ('Butterfly (Maschine)', 'Maschine · Ellenbogen auf Schulterhöhe · Polster mittig am Unterarm'),
  ('Kabelzug-Fliegende', 'Kabel · Rollen auf Schulterhöhe · Schritt nach vorn · Ellenbogen leicht gebeugt fixiert'),
  ('Dips (Brustversion)', 'Barren · Oberkörper vorgelehnt · Ellenbogen ausserhalb der Schulter · Beine gekreuzt'),
  ('Kniebeuge (Langhantel)', 'Langhantel · hoher Nacken · Stand schulterbreit · Füsse leicht nach aussen'),
  ('Frontkniebeuge', 'Langhantel · Frontablage · Ellenbogen hoch · Stand schulterbreit'),
  ('Beinpresse', 'Maschine · Füsse schulterbreit mittig auf der Platte · Rücken bleibt an der Lehne'),
  ('Hackenschmidt-Kniebeuge', 'Maschine · Füsse schulterbreit mittig · Rücken flach am Polster'),
  ('Bulgarian Split Squat', 'Kurzhanteln · hinterer Fuss auf der Bank · Schrittlänge etwa 60 cm · Oberkörper aufrecht'),
  ('Goblet Squat', 'Kurzhantel oder Kettlebell vor der Brust · Stand schulterbreit · Ellenbogen innen an den Knien'),
  ('Kreuzheben (konventionell)', 'Langhantel vom Boden · Stand hüftbreit · Obergriff schulterbreit · Stange am Schienbein'),
  ('Sumo-Kreuzheben', 'Langhantel vom Boden · breiter Stand · Griff innerhalb der Beine · Füsse nach aussen'),
  ('Rumänisches Kreuzheben', 'Langhantel · Stand hüftbreit · Obergriff schulterbreit · Knie leicht gebeugt fixiert'),
  ('Good Mornings', 'Langhantel · hoher Nacken · Stand hüftbreit · Knie leicht gebeugt fixiert'),
  ('Beinbeuger (liegend)', 'Maschine · Polster oberhalb der Ferse · Hüfte bleibt am Polster'),
  ('Beinbeuger (sitzend)', 'Maschine · Polster oberhalb der Ferse · Beckengurt fest'),
  ('Klimmzüge', 'Klimmzugstange · Obergriff · etwas breiter als schulterbreit · Beine gekreuzt'),
  ('Latzug', 'Kabel · breite Stange · Obergriff · Oberschenkelpolster fest · Oberkörper leicht zurück'),
  ('Langhantelrudern', 'Langhantel · Oberkörper etwa 45 Grad · Obergriff schulterbreit · zum unteren Rippenbogen'),
  ('Rudern am Kabel (sitzend)', 'Kabel · enger neutraler Griff · Oberkörper aufrecht · zum Bauchnabel'),
  ('T-Bar-Rudern', 'T-Bar · neutraler Griff · Oberkörper etwa 45 Grad · Brust am Polster'),
  ('Kurzhantelrudern (einarmig)', 'Kurzhantel · Knie und Hand auf der Bank · Rücken waagerecht · Zug entlang des Körpers'),
  ('Rudern (Maschine)', 'Maschine · Brust am Polster · neutraler Griff · Sitzhöhe so, dass die Griffe auf Brusthöhe sind'),
  ('Schulterdrücken (Langhantel)', 'Langhantel · stehend · Obergriff schulterbreit · Bahn dicht am Gesicht vorbei'),
  ('Schulterdrücken (Kurzhantel)', 'Kurzhanteln · Bank auf 80 Grad · neutraler bis Obergriff · Rippen unten'),
  ('Schulterpresse (Maschine)', 'Maschine · Griffe auf Ohrhöhe · Rücken an der Lehne'),
  ('Seitheben', 'Kurzhanteln · stehend · Ellenbogen leicht gebeugt fixiert · bis Schulterhöhe'),
  ('Frontheben', 'Kurzhanteln oder Scheibe · stehend · Ellenbogen fast gestreckt · bis Augenhöhe'),
  ('Face Pulls', 'Kabel · Seil auf Gesichtshöhe · Ellenbogen hoch · zum Kinn ziehen'),
  ('Bizeps-Curls (Langhantel)', 'SZ- oder Langhantel · stehend · Untergriff schulterbreit · Ellenbogen am Rumpf'),
  ('Scott-Curls', 'SZ-Hantel · Scott-Bank · Untergriff schulterbreit · Achsel liegt am Polster'),
  ('Trizepsdrücken am Kabel', 'Kabel · Seil oder gerade Stange · Rolle oben · Oberarm senkrecht fixiert'),
  ('Beinstrecker', 'Maschine · Polster oberhalb des Sprunggelenks · Drehpunkt auf Kniehöhe'),
  ('Hip Thrust', 'Langhantel · Schulterblätter auf der Bank · Füsse schulterbreit · Schienbein senkrecht oben')
) as v(name, setup)
where e.name = v.name and e.coach_id is null;
