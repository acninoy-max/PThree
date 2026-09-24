-- ============================================================
-- 0016 — Welche Uebungen der Athlet auf seiner Fortschrittsseite sieht
-- ============================================================
--
-- Aus dem Meeting: Der Athlet will „mein Bankdruecken" sehen. Die Daten
-- liegen vor, das Problem ist die Menge — wer zwoelf Uebungen macht,
-- bekaeme zwoelf Kurven und saehe damit nichts.
--
-- Also waehlt er aus. Und zwar aus ALLEN Uebungen, die er je geloggt hat,
-- nicht aus einer Vorauswahl: Auch die Uebung, die vor einem halben Jahr
-- zweimal vorkam, muss anwaehlbar sein.
--
-- Eigene Tabelle statt Spalte am Klienten: Es sind mehrere Eintraege mit
-- Reihenfolge, und eine Liste in einer Spalte waere eine Liste, die
-- niemand abfragen kann.

set search_path = public;

create table if not exists progress_selections (
  client_id   uuid not null references clients(id)   on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  -- Reihenfolge in der Anzeige. Der Athlet bestimmt, was oben steht.
  position    int  not null default 1,
  created_at  timestamptz not null default now(),
  primary key (client_id, exercise_id)
);

create index if not exists progress_selections_client_idx
  on progress_selections (client_id, position);

-- ------------------------------------------------------------
-- Rechte
-- ------------------------------------------------------------
--
-- `can_access_client` deckt beide Seiten ab: den betreuenden Coach und
-- den Athleten selbst. Genau richtig — der Trainer darf die Auswahl
-- sehen, um zu verstehen, worauf sein Klient schaut, und er darf sie
-- anpassen, wenn der Klient danach fragt.

alter table progress_selections enable row level security;

drop policy if exists progress_selections_access on progress_selections;
create policy progress_selections_access on progress_selections
  for all using (can_access_client(client_id))
  with check (can_access_client(client_id));

comment on table progress_selections is
  'Vom Athleten gewaehlte Uebungen fuer seine Fortschrittskurven. Leer '
  'heisst: noch nie gewaehlt — die Oberflaeche schlaegt dann die '
  'haeufigsten Uebungen vor, statt eine leere Seite zu zeigen.';
