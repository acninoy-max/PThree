-- ============================================================
-- 0018 — Jeder sieht seine eigene Auswahl
-- ============================================================
--
-- 0016 hat die Auswahl am Klienten festgemacht. Damit teilen Athlet und
-- Trainer dieselbe Liste — waehlt der Trainer in der Klientenakte andere
-- Uebungen, aendert sich die Fortschrittsseite des Athleten mit. Das
-- waere ein Uebergriff: Der Athlet schaut auf seine Entwicklung, der
-- Trainer auf die Stellen, an denen er nachsteuern will. Zwei Fragen,
-- zwei Listen.
--
-- Also kommt der Betrachter dazu. Der Schluessel ist jetzt
-- (client_id, viewer_id, exercise_id): welcher Klient, aus wessen Sicht,
-- welche Uebung.
--
-- viewer_id zeigt auf auth.users und nicht auf coaches: Der Athlet ist
-- kein Coach, waere dort also nicht eintragbar. Beide sind Nutzer.

set search_path = public;

-- ------------------------------------------------------------
-- Spalte und neuer Schluessel
-- ------------------------------------------------------------

alter table progress_selections
  add column if not exists viewer_id uuid references auth.users(id) on delete cascade;

-- Bestand gehoert dem Athleten: Vor dieser Migration konnte nur er
-- waehlen, die Oberflaeche bot es sonst nirgends an.
update progress_selections ps
   set viewer_id = c.profile_id
  from clients c
 where c.id = ps.client_id
   and ps.viewer_id is null
   and c.profile_id is not null;

-- Zeilen ohne verknuepftes Athletenkonto liessen sich niemandem
-- zuordnen. Sie waeren nach der Umstellung unsichtbar und wuerden nur
-- den Schluessel blockieren.
delete from progress_selections where viewer_id is null;

alter table progress_selections alter column viewer_id set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'progress_selections_pkey'
      and conrelid = 'progress_selections'::regclass
  ) then
    alter table progress_selections drop constraint progress_selections_pkey;
  end if;
end $$;

alter table progress_selections
  add primary key (client_id, viewer_id, exercise_id);

drop index if exists progress_selections_client_idx;
create index if not exists progress_selections_viewer_idx
  on progress_selections (client_id, viewer_id, position);

-- ------------------------------------------------------------
-- Rechte
-- ------------------------------------------------------------
--
-- `can_access_client` deckt weiterhin ab, WESSEN Daten man ueberhaupt
-- sehen darf. Neu dazu: Schreiben nur in eigenem Namen. Ohne diese
-- Bedingung koennte ein Trainer die Auswahl seines Klienten umschreiben
-- — genau das, was diese Migration abstellt.

drop policy if exists progress_selections_access on progress_selections;

create policy progress_selections_read on progress_selections
  for select using (can_access_client(client_id));

create policy progress_selections_write on progress_selections
  for all using (can_access_client(client_id) and viewer_id = auth.uid())
  with check (can_access_client(client_id) and viewer_id = auth.uid());

comment on column progress_selections.viewer_id is
  'Wessen Sicht. Athlet und Trainer waehlen unabhaengig voneinander; '
  'gelesen werden darf beides, geschrieben nur die eigene Liste.';
