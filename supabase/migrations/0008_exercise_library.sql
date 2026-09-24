-- ============================================================
-- 0008 — Grosse Uebungsbibliothek, Rumpf ohne Muster,
--        eigene Uebungen des Coaches
-- ============================================================
--
-- Drei Aenderungen:
--
-- 1. `pattern` darf leer sein.
--    Rumpfuebungen passen in keins der fuenf Grundmuster. Ein Plank
--    unter "Hueftbeuge" zu verbuchen wuerde die Kreuzheben-Kurve
--    verfaelschen — und genau diese Kurve ist unser Alleinstellungs-
--    merkmal. Rumpfarbeit laeuft deshalb ohne Muster: sie wird geloggt
--    und steht im Plan, taucht aber in keiner Musterkurve auf.
--    Joels fuenf Muster bleiben damit unangetastet.
--
-- 2. Die Bibliothek waechst von 17 auf 76 Uebungen —
--    vor allem Isolation, die vorher fast komplett fehlte.
--
-- 3. Athleten duerfen die eigenen Uebungen ihres Coaches lesen.
--    Ohne das koennte der Coach eine Uebung in den Plan legen, die
--    der Athlet in seiner App nicht sieht.

set search_path = public;

-- ------------------------------------------------------------
-- 1. Muster darf leer bleiben
-- ------------------------------------------------------------

alter table exercises     alter column pattern drop not null;
alter table plan_slots    alter column pattern drop not null;
alter table session_slots alter column pattern drop not null;

-- ------------------------------------------------------------
-- 2. Bibliothek auffuellen
--    coach_id bleibt null — global lesbar, fuer niemanden aenderbar.
-- ------------------------------------------------------------

insert into exercises (id, coach_id, name, pattern, default_block, cue, common_fault, is_bodyweight)
values
  ('11111111-0000-4000-8000-000000000100', null, 'Bankdrücken (Kurzhantel)', 'push', 'compound',
   'Tiefere Dehnung als an der Langhantel, Schulterblätter fixiert.', null, false),
  ('11111111-0000-4000-8000-000000000101', null, 'Negativbankdrücken', 'push', 'compound',
   'Untere Brust, Bahn Richtung unteres Brustbein.', null, false),
  ('11111111-0000-4000-8000-000000000102', null, 'Brustpresse (Maschine)', 'push', 'compound',
   'Feste Bahn — gut, wenn die Schulter Führung braucht.', null, false),
  ('11111111-0000-4000-8000-000000000103', null, 'Dips (Brustversion)', 'push', 'compound',
   'Leicht vorgelehnt, Ellenbogen ausserhalb der Schulter.', 'Zu tief gehen reizt die Schulterkapsel — bei 90 Grad stoppen.', true),
  ('11111111-0000-4000-8000-000000000104', null, 'Enge Liegestütze', 'push', 'functional',
   'Ellenbogen am Körper, Last auf dem Trizeps.', null, true),
  ('11111111-0000-4000-8000-000000000105', null, 'Liegestütze erhöht', 'push', 'functional',
   'Hände auf Bank oder Kiste — leichtere Variante mit gleicher Bahn.', null, true),
  ('11111111-0000-4000-8000-000000000106', null, 'Butterfly (Maschine)', 'push', 'isolation',
   'Brust isolieren, Ellenbogen leicht gebeugt fixieren.', null, false),
  ('11111111-0000-4000-8000-000000000107', null, 'Kabelzug-Fliegende', 'push', 'isolation',
   'Konstante Spannung über die ganze Bahn.', null, false),
  ('11111111-0000-4000-8000-000000000108', null, 'Trizepsdrücken am Kabel', 'push', 'isolation',
   'Oberarm bleibt still, nur der Unterarm bewegt sich.', null, false),
  ('11111111-0000-4000-8000-000000000109', null, 'Trizeps-Überkopfdrücken', 'push', 'isolation',
   'Langer Trizepskopf, in der Dehnung kontrollieren.', null, false),
  ('11111111-0000-4000-8000-000000000110', null, 'Skull Crusher', 'push', 'isolation',
   'Zur Stirn absenken, Oberarm schräg halten.', 'Ellenbogen wandern nach aussen — eng führen.', false),
  ('11111111-0000-4000-8000-000000000111', null, 'Trizeps-Dips an der Bank', 'push', 'isolation',
   'Rücken nah an der Bank, Ellenbogen nach hinten.', null, true),
  ('11111111-0000-4000-8000-000000000112', null, 'Latzug', 'pull', 'compound',
   'Brust zur Stange, aus den Ellenbogen ziehen.', 'Zurücklehnen und schwingen — Oberkörper ruhig halten.', false),
  ('11111111-0000-4000-8000-000000000113', null, 'Rudern am Kabel (sitzend)', 'pull', 'compound',
   'Schulterblätter zusammenführen, Oberkörper aufrecht.', null, false),
  ('11111111-0000-4000-8000-000000000114', null, 'T-Bar-Rudern', 'pull', 'compound',
   'Dicker Rücken, zum Bauchnabel ziehen.', null, false),
  ('11111111-0000-4000-8000-000000000115', null, 'Kurzhantelrudern (einarmig)', 'pull', 'compound',
   'Rumpf stabil, Zug entlang des Körpers.', null, false),
  ('11111111-0000-4000-8000-000000000116', null, 'Rudern (Maschine)', 'pull', 'compound',
   'Feste Bahn, gut für hohe Wiederholungen.', null, false),
  ('11111111-0000-4000-8000-000000000117', null, 'Inverted Row', 'pull', 'functional',
   'Körper gerade wie ein Brett, Brust zur Stange.', null, true),
  ('11111111-0000-4000-8000-000000000118', null, 'Bizeps-Curls (Langhantel)', 'pull', 'isolation',
   'Ellenbogen am Körper, kein Schwung aus der Hüfte.', 'Rückenschwung übernimmt — Gewicht runter.', false),
  ('11111111-0000-4000-8000-000000000119', null, 'Bizeps-Curls (Kurzhantel)', 'pull', 'isolation',
   'Oben leicht nach aussen drehen.', null, false),
  ('11111111-0000-4000-8000-000000000120', null, 'Hammer-Curls', 'pull', 'isolation',
   'Neutraler Griff, trifft Brachialis und Unterarm.', null, false),
  ('11111111-0000-4000-8000-000000000121', null, 'Scott-Curls', 'pull', 'isolation',
   'Oberarm liegt auf, keine Ausweichbewegung möglich.', null, false),
  ('11111111-0000-4000-8000-000000000122', null, 'Kabel-Curls', 'pull', 'isolation',
   'Spannung auch in der Streckung.', null, false),
  ('11111111-0000-4000-8000-000000000123', null, 'Reverse Flys', 'pull', 'isolation',
   'Hintere Schulter, Ellenbogen leicht gebeugt fixieren.', null, false),
  ('11111111-0000-4000-8000-000000000124', null, 'Nackenheben (Shrugs)', 'pull', 'isolation',
   'Gerade nach oben zucken, nicht kreisen.', null, false),
  ('11111111-0000-4000-8000-000000000125', null, 'Frontkniebeuge', 'squat', 'compound',
   'Ellenbogen hoch, Oberkörper aufrecht.', 'Ellenbogen fallen, die Stange rutscht — Rumpf spannen.', false),
  ('11111111-0000-4000-8000-000000000126', null, 'Beinpresse', 'squat', 'compound',
   'Füsse schulterbreit, Rücken bleibt an der Lehne.', 'Zu tief drücken hebt das Becken — Bahn begrenzen.', false),
  ('11111111-0000-4000-8000-000000000127', null, 'Hackenschmidt-Kniebeuge', 'squat', 'compound',
   'Geführte Bahn, viel Last auf dem Quadrizeps.', null, false),
  ('11111111-0000-4000-8000-000000000128', null, 'Bulgarian Split Squat', 'squat', 'compound',
   'Hinterer Fuss erhöht, Last auf dem vorderen Bein.', null, false),
  ('11111111-0000-4000-8000-000000000129', null, 'Step-Ups', 'squat', 'functional',
   'Ganze Fussfläche auf die Box, nicht abdrücken.', null, false),
  ('11111111-0000-4000-8000-000000000130', null, 'Beinstrecker', 'squat', 'isolation',
   'Quadrizeps isolieren, oben kurz halten.', null, false),
  ('11111111-0000-4000-8000-000000000131', null, 'Wadenheben (stehend)', 'squat', 'isolation',
   'Volle Dehnung unten, oben durchdrücken.', null, false),
  ('11111111-0000-4000-8000-000000000132', null, 'Wadenheben (sitzend)', 'squat', 'isolation',
   'Trifft den flachen Wadenmuskel unter dem Zwillingswadenmuskel.', null, false),
  ('11111111-0000-4000-8000-000000000133', null, 'Kreuzheben (konventionell)', 'hinge', 'compound',
   'Stange am Schienbein entlang, Hüfte und Knie strecken gleichzeitig.', 'Hüfte schiesst hoch, der Rücken zieht — zuerst Spannung aufbauen.', false),
  ('11111111-0000-4000-8000-000000000134', null, 'Sumo-Kreuzheben', 'hinge', 'compound',
   'Breiter Stand, aufrechter Oberkörper.', null, false),
  ('11111111-0000-4000-8000-000000000135', null, 'Good Mornings', 'hinge', 'compound',
   'Hüfte weit nach hinten, Rücken flach.', 'Zu viel Gewicht rundet den Rücken sofort — leicht anfangen.', false),
  ('11111111-0000-4000-8000-000000000136', null, 'Nordic Curls', 'hinge', 'functional',
   'Exzentrisch bremsen, so lang es geht.', null, true),
  ('11111111-0000-4000-8000-000000000137', null, 'Beinbeuger (liegend)', 'hinge', 'isolation',
   'Hüfte bleibt auf dem Polster.', null, false),
  ('11111111-0000-4000-8000-000000000138', null, 'Beinbeuger (sitzend)', 'hinge', 'isolation',
   'Volle Streckung zulassen, dann beugen.', null, false),
  ('11111111-0000-4000-8000-000000000139', null, 'Rückenstrecker (Hyperextension)', 'hinge', 'isolation',
   'Bis zur Geraden, nicht ins Hohlkreuz.', null, true),
  ('11111111-0000-4000-8000-000000000140', null, 'Glute Kickback (Kabel)', 'hinge', 'isolation',
   'Gesäss isoliert, Rumpf ruhig.', null, false),
  ('11111111-0000-4000-8000-000000000141', null, 'Schulterdrücken (Langhantel)', 'overhead', 'compound',
   'Rippen unten, Kopf durch, Stange über der Mitte.', 'Ausweichen ins Hohlkreuz — Gesäss und Bauch anspannen.', false),
  ('11111111-0000-4000-8000-000000000142', null, 'Schulterdrücken (Kurzhantel)', 'overhead', 'compound',
   'Freiere Bahn, gut für die Schulter.', null, false),
  ('11111111-0000-4000-8000-000000000143', null, 'Schulterpresse (Maschine)', 'overhead', 'compound',
   'Geführt, für hohe Wiederholungen am Ende.', null, false),
  ('11111111-0000-4000-8000-000000000144', null, 'Push Press', 'overhead', 'functional',
   'Kurzer Impuls aus den Beinen, dann drücken.', null, false),
  ('11111111-0000-4000-8000-000000000145', null, 'Landmine Press', 'overhead', 'functional',
   'Schulterfreundliche Schrägbahn.', null, false),
  ('11111111-0000-4000-8000-000000000146', null, 'Frontheben', 'overhead', 'isolation',
   'Vordere Schulter, kein Schwung.', null, false),
  ('11111111-0000-4000-8000-000000000147', null, 'Plank', null, 'core',
   'Gerade Linie, Gesäss und Bauch anspannen.', 'Hüfte sackt ab oder schiebt hoch — Zeit reduzieren statt Form opfern.', true),
  ('11111111-0000-4000-8000-000000000148', null, 'Seitstütz', null, 'core',
   'Becken hoch, Schulter über dem Ellenbogen.', null, true),
  ('11111111-0000-4000-8000-000000000149', null, 'Hollow Hold', null, 'core',
   'Unterer Rücken bleibt am Boden.', null, true),
  ('11111111-0000-4000-8000-000000000150', null, 'Crunch', null, 'core',
   'Nur der obere Rücken hebt ab.', null, true),
  ('11111111-0000-4000-8000-000000000151', null, 'Kabel-Crunch', null, 'core',
   'Mit Gewicht steigerbar, Hüfte bleibt fest.', null, false),
  ('11111111-0000-4000-8000-000000000152', null, 'Hängendes Beinheben', null, 'core',
   'Ohne Schwung, Becken nach oben kippen.', null, true),
  ('11111111-0000-4000-8000-000000000153', null, 'Russian Twist', null, 'core',
   'Aus dem Rumpf drehen, nicht aus den Armen.', null, true),
  ('11111111-0000-4000-8000-000000000154', null, 'Pallof Press', null, 'core',
   'Der Rumpf hält gegen die Drehung — Antirotation.', null, false),
  ('11111111-0000-4000-8000-000000000155', null, 'Ab Wheel', null, 'core',
   'Nur so weit rollen, wie der Rücken flach bleibt.', null, true),
  ('11111111-0000-4000-8000-000000000156', null, 'Dead Bug', null, 'core',
   'Gegengleich, unterer Rücken bleibt am Boden.', null, true),
  ('11111111-0000-4000-8000-000000000157', null, 'Bird Dog', null, 'core',
   'Arm und Bein gegengleich, Becken bleibt ruhig.', null, true),
  ('11111111-0000-4000-8000-000000000158', null, 'Farmers Walk', null, 'core',
   'Schwer tragen, aufrecht gehen, Rumpf hält alles zusammen.', null, false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. Athleten sehen die Uebungen ihres Coaches
-- ------------------------------------------------------------

drop policy if exists exercises_read on exercises;
create policy exercises_read on exercises
  for select using (
    coach_id is null
    or coach_id = auth.uid()
    or exists (
      select 1 from clients c
      where c.profile_id = auth.uid()
        and c.coach_id = exercises.coach_id
    )
  );

-- Schreibrecht bleibt wie gehabt: nur eigene Uebungen, nie die globalen.
-- (Policy exercises_own_write aus 0002 gilt unveraendert.)
