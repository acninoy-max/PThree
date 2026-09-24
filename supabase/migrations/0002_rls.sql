-- =====================================================================
-- PT FIVE — Row Level Security
--
-- Regel: Die App filtert nicht, die Datenbank gibt nichts anderes heraus.
-- Drei Sichten:
--   Coach     — sieht ausschließlich eigene Klienten und deren Daten.
--   Athlet    — sieht ausschließlich sich selbst.
--   Org-Admin — sieht aggregierte Kennzahlen der EIGENEN Kette, aber KEINE
--               Trainingsinhalte oder Gesundheitsdaten einzelner Klienten.
--               Qualitätssicherung, keine Überwachung.
-- =====================================================================

-- Org-Admins brauchen eine Kettenzuordnung, sonst greift die Trennung nicht.
alter table profiles
  add column if not exists organisation_id uuid references organisations(id) on delete set null;

-- ---------- Hilfsfunktionen ----------
-- security definer: laufen mit erhöhten Rechten und umgehen RLS. Damit
-- entsteht keine Endlosschleife, wenn eine Policy dieselbe Tabelle abfragt.

create or replace function current_role_is(target user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = target);
$$;

/** Kette des angemeldeten Nutzers — egal ob Coach oder Org-Admin. */
create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select organisation_id from profiles where id = auth.uid()),
    (select organisation_id from coaches  where id = auth.uid())
  );
$$;

/** Gehört dieser Klient dem angemeldeten Coach oder ist er der Athlet selbst? */
create or replace function can_access_client(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients c
    where c.id = target
      and (c.coach_id = auth.uid() or c.profile_id = auth.uid())
  );
$$;

-- ---------- RLS aktivieren ----------
alter table organisations     enable row level security;
alter table profiles          enable row level security;
alter table coaches           enable row level security;
alter table clients           enable row level security;
alter table client_invites    enable row level security;
alter table exercises         enable row level security;
alter table templates         enable row level security;
alter table plans             enable row level security;
alter table plan_days         enable row level security;
alter table plan_slots        enable row level security;
alter table sessions          enable row level security;
alter table session_slots     enable row level security;
alter table session_sets      enable row level security;
alter table appointments      enable row level security;
alter table check_in_configs  enable row level security;
alter table check_ins         enable row level security;
alter table body_metrics      enable row level security;
alter table messages          enable row level security;
alter table nutrition_targets enable row level security;
alter table nutrition_logs    enable row level security;

-- ---------- Profile ----------
create policy profiles_self_read on profiles
  for select using (id = auth.uid());
create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_coach_read on profiles
  for select using (
    exists (select 1 from clients c where c.profile_id = profiles.id and c.coach_id = auth.uid())
  );

-- ---------- Coaches ----------
create policy coaches_self_all on coaches
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy coaches_client_read on coaches
  for select using (
    exists (select 1 from clients c where c.coach_id = coaches.id and c.profile_id = auth.uid())
  );
-- Org-Admin sieht nur Coaches der eigenen Kette.
create policy coaches_org_read on coaches
  for select using (
    current_role_is('org_admin')
    and organisation_id is not null
    and organisation_id = current_org_id()
  );

-- ---------- Organisationen ----------
create policy organisations_member_read on organisations
  for select using (id = current_org_id());

-- ---------- Klienten ----------
create policy clients_coach_all on clients
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy clients_self_read on clients
  for select using (profile_id = auth.uid());
create policy clients_self_update on clients
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy client_invites_coach_all on client_invites
  for all using (
    exists (select 1 from clients c where c.id = client_invites.client_id and c.coach_id = auth.uid())
  );

-- ---------- Übungen ----------
create policy exercises_read on exercises
  for select using (coach_id is null or coach_id = auth.uid());
create policy exercises_own_write on exercises
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- ---------- Vorlagen ----------
create policy templates_read on templates
  for select using (is_system or coach_id = auth.uid());
create policy templates_own_write on templates
  for all using (coach_id = auth.uid() and not is_system)
  with check (coach_id = auth.uid() and not is_system);

-- ---------- Pläne ----------
create policy plans_coach_all on plans
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy plans_client_read on plans
  for select using (can_access_client(client_id));

-- Lesen: eigener Plan, eigener Klient, eigene Vorlage oder System-Vorlage.
create policy plan_days_read on plan_days
  for select using (
    exists (
      select 1 from plans p where p.id = plan_days.plan_id
        and (p.coach_id = auth.uid() or can_access_client(p.client_id))
    )
    or exists (
      select 1 from templates t where t.id = plan_days.template_id
        and (t.coach_id = auth.uid() or t.is_system)
    )
  );

-- Schreiben: nur eigene Pläne und eigene Vorlagen. System-Vorlagen sind tabu.
create policy plan_days_write on plan_days
  for all using (
    exists (select 1 from plans p where p.id = plan_days.plan_id and p.coach_id = auth.uid())
    or exists (
      select 1 from templates t where t.id = plan_days.template_id
        and t.coach_id = auth.uid() and not t.is_system
    )
  ) with check (
    exists (select 1 from plans p where p.id = plan_days.plan_id and p.coach_id = auth.uid())
    or exists (
      select 1 from templates t where t.id = plan_days.template_id
        and t.coach_id = auth.uid() and not t.is_system
    )
  );

create policy plan_slots_read on plan_slots
  for select using (
    exists (
      select 1 from plan_days d
      left join plans p     on p.id = d.plan_id
      left join templates t on t.id = d.template_id
      where d.id = plan_slots.plan_day_id
        and (
          p.coach_id = auth.uid()
          or (p.client_id is not null and can_access_client(p.client_id))
          or t.coach_id = auth.uid()
          or t.is_system
        )
    )
  );

create policy plan_slots_write on plan_slots
  for all using (
    exists (
      select 1 from plan_days d
      left join plans p     on p.id = d.plan_id
      left join templates t on t.id = d.template_id
      where d.id = plan_slots.plan_day_id
        and (p.coach_id = auth.uid() or (t.coach_id = auth.uid() and not t.is_system))
    )
  ) with check (
    exists (
      select 1 from plan_days d
      left join plans p     on p.id = d.plan_id
      left join templates t on t.id = d.template_id
      where d.id = plan_slots.plan_day_id
        and (p.coach_id = auth.uid() or (t.coach_id = auth.uid() and not t.is_system))
    )
  );

-- ---------- Einheiten ----------
create policy sessions_coach_all on sessions
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy sessions_client_all on sessions
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));

create policy session_slots_access on session_slots
  for all using (
    exists (select 1 from sessions s where s.id = session_slots.session_id
      and (s.coach_id = auth.uid() or can_access_client(s.client_id)))
  ) with check (
    exists (select 1 from sessions s where s.id = session_slots.session_id
      and (s.coach_id = auth.uid() or can_access_client(s.client_id)))
  );

create policy session_sets_access on session_sets
  for all using (
    exists (
      select 1 from session_slots sl
      join sessions s on s.id = sl.session_id
      where sl.id = session_sets.session_slot_id
        and (s.coach_id = auth.uid() or can_access_client(s.client_id))
    )
  ) with check (
    exists (
      select 1 from session_slots sl
      join sessions s on s.id = sl.session_id
      where sl.id = session_sets.session_slot_id
        and (s.coach_id = auth.uid() or can_access_client(s.client_id))
    )
  );

-- ---------- Termine ----------
create policy appointments_coach_all on appointments
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy appointments_client_read on appointments
  for select using (can_access_client(client_id));

-- ---------- Check-ins und Gesundheitsdaten ----------
-- Bewusst KEINE Org-Admin-Policy: Ketten sehen hier strukturell nichts.
create policy check_in_configs_access on check_in_configs
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));

create policy check_ins_access on check_ins
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));

create policy body_metrics_access on body_metrics
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));

create policy messages_access on messages
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));

create policy nutrition_targets_access on nutrition_targets
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));

create policy nutrition_logs_access on nutrition_logs
  for all using (can_access_client(client_id)) with check (can_access_client(client_id));
