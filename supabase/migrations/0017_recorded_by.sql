-- ============================================================
-- 0017 — Wer hat die Einheit erfasst?
-- ============================================================
--
-- „Mit Trainer" war bisher nur ein Etikett am Plantag: Es stand in der
-- App, aber nichts haing daran. Jetzt traegt der Trainer die Saetze am
-- eigenen Handy ein, waehrend er neben dem Klienten steht.
--
-- KORREKTUR ZU EINER FRUEHEREN ANNAHME: Ich hatte im Backlog notiert, die
-- Zeilensicherheit verbiete dem Trainer das Schreiben im Namen eines
-- Klienten. Das stimmt nicht. `sessions_coach_all` aus 0002 erlaubt dem
-- Coach seit jeher alles an Einheiten mit seiner eigenen coach_id, und
-- session_slots wie session_sets haengen daran. Es fehlte also keine
-- Rechteaenderung, sondern nur die Frage, WER es eingetragen hat.
--
-- Und die ist die eigentlich wichtige. „Vom Trainer betreut" gegenueber
-- „allein gemacht" ist die Zahl, die ein Ketten-Dashboard spaeter
-- ausweisen muss — ohne sie ist die Betreuungsquote eine Behauptung.
--
-- Warum nicht einfach is_self_directed umdeuten: Das Feld sagt, ob der
-- Athlet OHNE Plan trainiert hat. Etwas ganz anderes. Ein Trainer kann
-- eine freie Einheit erfassen, ein Athlet kann einem Plan allein folgen.

set search_path = public;

-- NULL = der Athlet selbst. Gesetzt = dieser Coach hat eingetragen.
-- on delete set null: Verlaesst ein Trainer die Einrichtung, bleibt die
-- Einheit erhalten — die Historie des Klienten gehoert ihm, nicht dem
-- Trainer.
alter table sessions
  add column if not exists recorded_by uuid references coaches(id) on delete set null;

create index if not exists sessions_recorded_by_idx
  on sessions (recorded_by) where recorded_by is not null;

comment on column sessions.recorded_by is
  'Coach, der die Einheit erfasst hat. NULL = der Athlet selbst. '
  'Grundlage der Betreuungsquote; nicht zu verwechseln mit '
  'is_self_directed, das den fehlenden Plan meint.';
