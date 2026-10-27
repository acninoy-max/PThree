-- ============================================================
-- 0036 — Wochenziel des Klienten (Grundlage der Serie)
-- ============================================================
--
-- Meeting 27.10.2026: Der Klient setzt sich selbst ein Ziel, wie oft er
-- pro Woche trainieren will. Daraus rechnet die App die Serie (Wochen in
-- Folge mit erreichtem Ziel, app/serie.ts). null = noch nicht gesetzt,
-- dann fragt die App auf „Heute" danach.
--
-- WER SCHREIBT
-- ------------
-- Der Klient selbst — es ist SEIN Ziel. Die Zeilensicherheit erlaubt ihm
-- das Bearbeiten seiner Zeile schon (clients_self_update), und
-- guard_client_self_edit setzt nur die Spalten des Trainers zurück;
-- weekly_goal gehört nicht dazu. Der Trainer darf es ebenfalls ändern.

alter table clients
  add column if not exists weekly_goal int;

alter table clients drop constraint if exists clients_weekly_goal_gueltig;
alter table clients add constraint clients_weekly_goal_gueltig
  check (weekly_goal is null or weekly_goal between 1 and 7);

comment on column clients.weekly_goal is
  'Trainingstage pro Woche, die der Klient sich vornimmt (1–7, 0036). null = nicht gesetzt.';

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'clients' and column_name = 'weekly_goal') then
    raise exception '0036: clients.weekly_goal fehlt.';
  end if;
  -- Darf der Trainer-Schutz die Spalte nicht zurücksetzen? Nachsehen,
  -- dass sie nicht in guard_client_self_edit steht.
  if (select prosrc from pg_proc where proname = 'guard_client_self_edit') like '%weekly_goal%' then
    raise exception '0036: guard_client_self_edit setzt weekly_goal zurueck — der Klient koennte es nie aendern.';
  end if;
end;
$$;
