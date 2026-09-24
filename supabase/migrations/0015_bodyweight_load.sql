-- ============================================================
-- 0015 — Koerpergewicht als Last
-- ============================================================
--
-- Bisher galt bei Koerpergewichtsuebungen die Wiederholungszahl als
-- Fortschrittsmass, und das Kilogramm-Volumen war null. Das hatte einen
-- Fehler, der erst beim Nachrechnen auffiel:
--
--   Klimmzug, 8 Wiederholungen, Athlet 85 kg
--     ohne Zusatz : Wert 8    (Wiederholungen)   Volumen     0 kg
--     + 20 kg     : Wert 25,3 (nur der Guertel)  Volumen   160 kg
--
-- Drei Dinge stimmen daran nicht. Der Wert 25,3 ignoriert die 85 kg, die
-- derselbe Mensch hochzieht. Das Volumen springt von 0 auf 160, obwohl
-- der Satz kaum schwerer wurde. Und weil die Uebung damit die Skala
-- wechselt, fallen alle bisherigen Klimmzug-Einheiten aus der Kurve — sie
-- liegen auf der anderen Seite des Vergleichsfilters.
--
-- Das ist dasselbe Problem, gegen das das Slot-Modell gebaut wurde, nur
-- eine Ebene tiefer: Ein Wechsel des Werkzeugs darf die Historie nicht
-- zerreissen.
--
-- Loesung: Die Last ist Koerpergewicht mal Faktor, plus Zusatzgewicht.
-- Der Klimmzug hebt den ganzen Koerper (Faktor 1,0), der Liegestuetz etwa
-- zwei Drittel (0,64). Damit liegt alles auf EINER Skala.
--
--   ohne Zusatz : 85 kg Last  ->  1RM 108 kg
--   + 20 kg     : 105 kg Last ->  1RM 133 kg
--
-- Zwei Entscheidungen dahinter:
--
-- 1. Der Koerpergewichtsanteil wird AM SATZ festgehalten, nicht bei jeder
--    Anzeige neu gerechnet. Sonst schriebe eine spaetere Korrektur des
--    Faktors — oder ein Gewichtsverlust des Athleten — die gesamte
--    Historie rueckwirkend um. Dieselbe Regel wie bei muscle_group auf
--    session_slots.
--
-- 2. Gehaltene Uebungen bekommen KEINEN Faktor. Bei einer Plank ist
--    „Last mal Wiederholungen" keine sinnvolle Groesse. Sie bleiben auf
--    der Wiederholungsskala, und das ist ehrlicher als eine erfundene
--    Zahl.

set search_path = public;

-- ------------------------------------------------------------
-- Spalten
-- ------------------------------------------------------------

-- Anteil des Koerpergewichts, den die Uebung bewegt.
-- NULL = keine Koerpergewichtsuebung oder bewusst ohne Last gefuehrt.
-- Bis 1.5, weil Sprungvarianten kurzzeitig mehr als das eigene Gewicht
-- beschleunigen — verbieten muss man das nicht.
alter table exercises
  add column if not exists bodyweight_factor numeric(4,2);

alter table exercises drop constraint if exists exercises_bodyweight_factor_range;
alter table exercises add constraint exercises_bodyweight_factor_range
  check (bodyweight_factor is null
         or (bodyweight_factor > 0 and bodyweight_factor <= 1.5));

-- Der bewegte Koerperanteil in Kilogramm, festgehalten zum Zeitpunkt des
-- Satzes. Die Gesamtlast ist body_load_kg + weight_kg.
alter table session_sets
  add column if not exists body_load_kg numeric(6,2);

alter table session_sets drop constraint if exists session_sets_body_load_range;
alter table session_sets add constraint session_sets_body_load_range
  check (body_load_kg is null
         or (body_load_kg >= 0 and body_load_kg <= 400));

-- ------------------------------------------------------------
-- Faktoren
-- ------------------------------------------------------------
--
-- Vorschlagswerte. Joel liest sie gegen; sechs davon haengen stark von
-- der Ausfuehrung ab und sind in der Begleitliste markiert.

update exercises set bodyweight_factor = 1.00
 where coach_id is null and name in (
    'Gironda Dips (Brustversion)',
    'Klimmzüge'
  );

update exercises set bodyweight_factor = 0.75
 where coach_id is null and name in (
    'Klimmzüge mit Band'
  );

update exercises set bodyweight_factor = 0.64
 where coach_id is null and name in (
    'Enge Liegestütze',
    'Liegestütze'
  );

update exercises set bodyweight_factor = 0.60
 where coach_id is null and name in (
    'Nordic Curls'
  );

update exercises set bodyweight_factor = 0.55
 where coach_id is null and name in (
    'Liegestütze erhöht'
  );

update exercises set bodyweight_factor = 0.50
 where coach_id is null and name in (
    'Inverted Row'
  );

update exercises set bodyweight_factor = 0.45
 where coach_id is null and name in (
    'Rückenstrecker (Hyperextension)'
  );

update exercises set bodyweight_factor = 0.40
 where coach_id is null and name in (
    'Trizeps-Dips an der Bank'
  );

-- ------------------------------------------------------------
-- Altdaten nachtragen
-- ------------------------------------------------------------
--
-- Fuer jeden bereits geloggten Satz einer Koerpergewichtsuebung das
-- Koerpergewicht aus dem zeitlich naechsten Check-in eintragen.
--
-- Der naechste, nicht der letzte davor: Wer sein Gewicht unregelmaessig
-- meldet, haette sonst Saetze ohne jeden Wert, obwohl eine Woche spaeter
-- eine Messung vorliegt. Die Naeherung ist grob, aber sie ist besser als
-- eine Luecke — und sie steht fest, sobald sie einmal geschrieben ist.
--
-- Saetze ohne irgendeinen Check-in bleiben NULL und damit auf der alten
-- Wiederholungsskala. Keine geratenen Zahlen.

update session_sets ss
   set body_load_kg = round(naechster.weight_kg * e.bodyweight_factor, 2)
  from session_slots sl
  join sessions s   on s.id = sl.session_id
  join exercises e  on e.id = sl.exercise_id
  cross join lateral (
        select c.weight_kg
          from check_ins c
         where c.client_id = s.client_id
           and c.weight_kg is not null
           and c.submitted_at is not null
         order by abs(extract(epoch from (c.submitted_at - s.performed_at)))
         limit 1
      ) as naechster
 where ss.session_slot_id = sl.id
   and ss.body_load_kg is null
   -- Bewusst NICHT ss.is_bodyweight: Das Kennzeichen wird beim Loggen
   -- auf false gesetzt, sobald jemand Zusatzgewicht eintraegt. Danach
   -- waeren ausgerechnet die Klimmzuege mit Guertel uebersprungen — die
   -- Saetze, um die es hier geht. Massgeblich ist die Uebung.
   and e.bodyweight_factor is not null;

comment on column exercises.bodyweight_factor is
  'Anteil des Koerpergewichts, den die Uebung bewegt. 1.0 = ganzer '
  'Koerper. NULL = laeuft ueber Wiederholungen statt ueber Last.';
comment on column session_sets.body_load_kg is
  'Bewegter Koerperanteil in kg, festgehalten zum Zeitpunkt des Satzes. '
  'Gesamtlast = body_load_kg + weight_kg. Bewusst gespeichert und nicht '
  'gerechnet, damit spaetere Aenderungen die Historie nicht umschreiben.';
