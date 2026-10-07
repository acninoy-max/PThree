-- ============================================================
-- 0026 — Übungsbibliothek auf Englisch
-- ============================================================
--
-- Seit dem 07.10.2026 ist die Oberfläche zweisprachig (Englisch
-- Standard, Deutsch wählbar). Die 77 globalen Übungen sind aber Inhalt
-- in der Datenbank, nicht Text im Code — sie standen bisher nur
-- deutsch da, auch für englische Nutzer.
--
-- WARUM EIGENE SPALTEN UND KEINE ÜBERSETZUNGSTABELLE
-- --------------------------------------------------
-- Zwei Sprachen, vier Felder. Eine Tabelle (exercise_id, locale, feld,
-- text) wäre allgemeiner — und für jede Abfrage ein Join mehr, eine
-- Regel mehr, und ein fehlender Eintrag fiele erst im Browser auf.
-- Vier Spalten sieht man in jeder Zeile an.
--
-- WER WAS SIEHT
-- -------------
-- Die App nimmt bei Englisch `name_en`, `setup_en`, `cue_en`,
-- `common_fault_en`, und fällt auf das deutsche Feld zurück, wenn das
-- englische leer ist. Eigene Übungen der Trainer bleiben, wie sie
-- eingetippt wurden — die englischen Spalten bleiben dort leer.
--
-- Die Übersetzung ist von mir; die Fachsprache gehört Joël. Ändern geht
-- jederzeit per `update exercises set name_en = ... where id = ...` —
-- dafür braucht es keine neue Migration.
--
-- NACHSEHEN STATT HOFFEN
-- ----------------------
-- Am Ende prüft ein Block, dass jede globale Übung einen englischen
-- Namen hat, und bricht sonst ab. Ein `update ... from (values ...)`,
-- dessen ID nicht passt, ändert null Zeilen und meldet Erfolg — genau
-- die stille Bedingung aus PROJEKTSTAND.md, Abschnitt 7 (a).

alter table exercises add column if not exists name_en         text;
alter table exercises add column if not exists setup_en        text;
alter table exercises add column if not exists cue_en          text;
alter table exercises add column if not exists common_fault_en text;

comment on column exercises.name_en is
  'Englischer Name (0026). Leer = deutscher Name gilt auch auf Englisch.';

update exercises e
   set name_en         = v.name_en,
       setup_en        = nullif(v.setup_en, ''),
       cue_en          = nullif(v.cue_en, ''),
       common_fault_en = nullif(v.fault_en, '')
  from (values
  -- ---------- Brust ----------
  ('0100', 'Dumbbell Bench Press',
   'Dumbbells · flat bench · neutral to overhand grip · wrists stacked',
   'Deeper stretch than with the barbell, shoulder blades locked in.', ''),
  ('0001', 'Barbell Bench Press',
   'Barbell · flat bench · overhand grip · shoulder width plus one hand',
   'Chest up, shoulders back and down.',
   'Elbows flare to 90 degrees — tucking them slightly protects the shoulder.'),
  ('0102', 'Chest Press (Machine)',
   'Machine · handles at nipple height · back against the pad · feet flat',
   'Fixed path — good when the shoulder needs guidance.', ''),
  ('0106', 'Pec Deck (Machine)',
   'Machine · elbows at shoulder height · pad in the middle of the forearm',
   'Isolate the chest, keep the elbows slightly bent and fixed.', ''),
  ('0103', 'Gironda Dips (Chest Version)',
   'Parallel bars · torso leaning forward · elbows outside the shoulders · legs crossed',
   'Lean forward slightly, elbows outside the shoulders.',
   'Going too deep irritates the shoulder capsule — stop at 90 degrees.'),
  ('0107', 'Cable Fly',
   'Cable · pulleys at shoulder height · step forward · elbows slightly bent and fixed',
   'Constant tension through the whole range.', ''),
  ('0004', 'Dumbbell Fly', '',
   'Isolate the chest — stretch, then bring together.', ''),
  ('0002', 'Push-Ups', '',
   'Shoulders back, chest close to the floor, press under control.',
   'Hips sag — brace the core and keep a straight line.'),
  ('0105', 'Incline Push-Ups', '',
   'Hands on a bench or box — easier variation with the same path.', ''),
  ('0101', 'Decline Bench Press',
   'Barbell · bench at minus 15 degrees · overhand grip · shoulder width',
   'Lower chest, bar path towards the lower sternum.', ''),
  ('0003', 'Incline Dumbbell Press (30°)',
   'Dumbbells · bench at 30 degrees · overhand grip · shoulder blades locked in',
   'Upper chest and shoulders, control the stretch.', ''),
  ('0104', 'Close-Grip Push-Ups', '',
   'Elbows close to the body, load on the triceps.', ''),

  -- ---------- Rücken ----------
  ('0117', 'Inverted Row', '',
   'Body straight as a plank, chest to the bar.', ''),
  ('0011', 'Pull-Ups',
   'Pull-up bar · overhand grip · slightly wider than shoulder width · legs crossed',
   'Pull from the elbows, not from the arms.',
   'Biceps take over first — initiate the movement from the lats.'),
  ('0012', 'Band-Assisted Pull-Ups', '',
   'Same path as strict, the band takes off load.', ''),
  ('0133', 'Conventional Deadlift',
   'Barbell from the floor · hip-width stance · overhand grip shoulder width · bar against the shins',
   'Bar along the shins, extend hips and knees together.',
   'Hips shoot up and the back pulls — build tension first.'),
  ('0115', 'One-Arm Dumbbell Row',
   'Dumbbell · knee and hand on the bench · back horizontal · pull along the body',
   'Stable torso, pull along the body.', ''),
  ('0013', 'Barbell Row',
   'Barbell · torso at about 45 degrees · overhand grip shoulder width · to the lower ribs',
   'Upper back and rear delts, pull to the lower ribs.', ''),
  ('0112', 'Lat Pulldown',
   'Cable · wide bar · overhand grip · thigh pad tight · torso leaning back slightly',
   'Chest to the bar, pull from the elbows.',
   'Leaning back and swinging — keep the torso still.'),
  ('0124', 'Shrugs', '',
   'Shrug straight up, don''t roll.', ''),
  ('0139', 'Back Extension (Hyperextension)', '',
   'Up to straight, not into an arch.', ''),
  ('0116', 'Machine Row',
   'Machine · chest on the pad · neutral grip · seat height so the handles are at chest level',
   'Fixed path, good for high reps.', ''),
  ('0113', 'Seated Cable Row',
   'Cable · close neutral grip · torso upright · to the belly button',
   'Squeeze the shoulder blades together, torso upright.', ''),
  ('0114', 'T-Bar Row',
   'T-bar · neutral grip · torso at about 45 degrees · chest on the pad',
   'Thick back, pull to the belly button.', ''),

  -- ---------- Schultern ----------
  ('0041', 'Arnold Press', '',
   'Firm stance, stack the weight directly over the head.',
   'Missing core tension pushes into the lower back — breathe into the belly before every rep.'),
  ('0042', 'Upright Row', '',
   'Front and side delts, triceps, core.', ''),
  ('0014', 'Face Pulls',
   'Cable · rope at face height · elbows high · pull to the chin',
   'Rear delts, posture, shoulder health.', ''),
  ('0146', 'Front Raise',
   'Dumbbells or plate · standing · elbows almost straight · up to eye level',
   'Front delts, no swinging.', ''),
  ('0145', 'Landmine Press', '',
   'Shoulder-friendly angled path.', ''),
  ('0144', 'Push Press', '',
   'Short drive from the legs, then press.', ''),
  ('0123', 'Reverse Flys', '',
   'Rear delts, keep the elbows slightly bent and fixed.', ''),
  ('0142', 'Dumbbell Shoulder Press',
   'Dumbbells · bench at 80 degrees · neutral to overhand grip · ribs down',
   'Freer path, good for the shoulder.', ''),
  ('0141', 'Barbell Overhead Press',
   'Barbell · standing · overhand grip shoulder width · bar path close past the face',
   'Ribs down, head through, bar over mid-foot.',
   'Arching the lower back — squeeze glutes and abs.'),
  ('0143', 'Shoulder Press (Machine)',
   'Machine · handles at ear height · back against the pad',
   'Guided, for high reps at the end.', ''),
  ('0043', 'Lateral Raise',
   'Dumbbells · standing · elbows slightly bent and fixed · up to shoulder height',
   'Side delts, lead with the elbows, no swinging.', ''),

  -- ---------- Bizeps ----------
  ('0119', 'Dumbbell Biceps Curl', '',
   'Turn slightly outward at the top.', ''),
  ('0118', 'Barbell Biceps Curl',
   'EZ or straight bar · standing · underhand grip shoulder width · elbows at the sides',
   'Elbows at the sides, no swinging from the hips.',
   'Back swing takes over — lower the weight.'),
  ('0120', 'Hammer Curls', '',
   'Neutral grip, hits brachialis and forearm.', ''),
  ('0122', 'Cable Curls', '',
   'Tension even at full extension.', ''),
  ('0121', 'Preacher Curls',
   'EZ bar · preacher bench · underhand grip shoulder width · armpit against the pad',
   'Upper arm rests on the pad, no cheating possible.', ''),

  -- ---------- Trizeps ----------
  ('0110', 'Skull Crusher', '',
   'Lower to the forehead, keep the upper arm angled.',
   'Elbows drift outward — keep them tight.'),
  ('0111', 'Bench Dips', '',
   'Back close to the bench, elbows pointing back.', ''),
  ('0109', 'Overhead Triceps Extension', '',
   'Long head of the triceps, control the stretch.', ''),
  ('0108', 'Cable Triceps Pushdown',
   'Cable · rope or straight bar · high pulley · upper arm vertical and fixed',
   'Upper arm stays still, only the forearm moves.', ''),

  -- ---------- Beine vorne ----------
  ('0023', 'Walking Lunges', '',
   'Long, controlled steps.', ''),
  ('0126', 'Leg Press',
   'Machine · feet shoulder width in the middle of the platform · back stays against the pad',
   'Feet shoulder width, back stays against the pad.',
   'Going too deep lifts the pelvis — limit the range.'),
  ('0130', 'Leg Extension',
   'Machine · pad just above the ankle · pivot at knee height',
   'Isolate the quads, hold briefly at the top.', ''),
  ('0125', 'Front Squat',
   'Barbell · front rack · elbows high · shoulder-width stance',
   'Elbows high, torso upright.',
   'Elbows drop and the bar slides — brace the core.'),
  ('0022', 'Goblet Squat',
   'Dumbbell or kettlebell at the chest · shoulder-width stance · elbows inside the knees',
   'Torso upright, knees over the toes.', ''),
  ('0127', 'Hack Squat',
   'Machine · feet shoulder width in the middle · back flat against the pad',
   'Guided path, lots of load on the quads.', ''),
  ('0021', 'Barbell Back Squat',
   'Barbell · high bar · shoulder-width stance · feet turned out slightly',
   'Upright, knees forward, drive up through the heels.',
   'Heels lift, knees cave in — spread the floor apart.'),
  ('0200', 'Split Squat (Stationary)',
   'Staggered stance about one leg length, back heel raised.',
   'Back foot on the floor, torso upright — the front thigh does the work.', ''),
  ('0129', 'Step-Ups', '',
   'Whole foot on the box, don''t push off.', ''),

  -- ---------- Beinbeuger, Gesäß, Waden ----------
  ('0137', 'Lying Leg Curl',
   'Machine · pad just above the heel · hips stay on the pad',
   'Hips stay on the pad.', ''),
  ('0138', 'Seated Leg Curl',
   'Machine · pad just above the heel · lap belt tight',
   'Allow full extension, then curl.', ''),
  ('0135', 'Good Mornings',
   'Barbell · high bar · hip-width stance · knees slightly bent and fixed',
   'Hips far back, back flat.',
   'Too much weight rounds the back immediately — start light.'),
  ('0136', 'Nordic Curls', '',
   'Brake the eccentric for as long as you can.', ''),
  ('0031', 'Romanian Deadlift',
   'Barbell · hip-width stance · overhand grip shoulder width · knees slightly bent and fixed',
   'Push the hips back instead of pulling the weight up.',
   'Back rounds — hinge from the hips, keep the ribs down.'),
  ('0132', 'Seated Calf Raise', '',
   'Hits the flat calf muscle (soleus) under the gastrocnemius.', ''),
  ('0131', 'Standing Calf Raise', '',
   'Full stretch at the bottom, push all the way up at the top.', ''),
  ('0128', 'Bulgarian Split Squat',
   'Dumbbells · back foot on the bench · stride about 60 cm · torso upright',
   'Back foot elevated, load on the front leg.', ''),
  ('0140', 'Cable Glute Kickback', '',
   'Glutes isolated, torso still.', ''),
  ('0033', 'Hip Thrust',
   'Barbell · shoulder blades on the bench · feet shoulder width · shins vertical at the top',
   'Squeeze the glutes, ribs down, chin tucked.', ''),
  ('0032', 'Kettlebell Swing', '',
   'The hips snap, the arms just swing along.', ''),
  ('0134', 'Sumo Deadlift',
   'Barbell from the floor · wide stance · grip inside the legs · feet turned out',
   'Wide stance, upright torso.', ''),

  -- ---------- Rumpf ----------
  ('0155', 'Ab Wheel', '',
   'Only roll out as far as the back stays flat.', ''),
  ('0157', 'Bird Dog', '',
   'Opposite arm and leg, pelvis stays still.', ''),
  ('0150', 'Crunch', '',
   'Only the upper back lifts off.', ''),
  ('0156', 'Dead Bug', '',
   'Opposite limbs, lower back stays on the floor.', ''),
  ('0158', 'Farmer''s Walk', '',
   'Carry heavy, walk tall, the core holds it all together.', ''),
  ('0152', 'Hanging Leg Raise', '',
   'No swinging, tilt the pelvis up.', ''),
  ('0149', 'Hollow Hold', '',
   'Lower back stays on the floor.', ''),
  ('0151', 'Cable Crunch', '',
   'Progress with weight, hips stay fixed.', ''),
  ('0154', 'Pallof Press', '',
   'The core resists the rotation — anti-rotation.', ''),
  ('0147', 'Plank', '',
   'Straight line, squeeze glutes and abs.',
   'Hips sag or pike up — cut the time instead of sacrificing form.'),
  ('0153', 'Russian Twist', '',
   'Rotate from the core, not from the arms.', ''),
  ('0148', 'Side Plank', '',
   'Hips up, shoulder over the elbow.', '')
  ) as v(kurz, name_en, setup_en, cue_en, fault_en)
 where e.id = ('11111111-0000-4000-8000-00000000' || v.kurz)::uuid
   and e.coach_id is null;

-- Nachsehen, ob es gewirkt hat. Fehlt einer globalen Übung der
-- englische Name, ist eine ID oben falsch — oder es gibt eine Übung,
-- die nach dem 07.10.2026 dazugekommen ist und hier noch fehlt. Beides
-- soll laut scheitern, nicht still eine deutsche Zeile in der
-- englischen Liste hinterlassen.
do $$
declare
  v_fehlt int;
begin
  select count(*) into v_fehlt
    from exercises
   where coach_id is null and (name_en is null or name_en = '');
  if v_fehlt > 0 then
    raise exception
      '0026: % globale Uebung(en) ohne englischen Namen — IDs pruefen.',
      v_fehlt;
  end if;
end;
$$;
