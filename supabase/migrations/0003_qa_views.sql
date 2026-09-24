-- =====================================================================
-- PT FIVE — Aggregations-Views für das Ketten-QA-Dashboard (Phase 2)
--
-- Die Views entstehen jetzt, obwohl das Dashboard später kommt: Sie zwingen
-- dazu, organisation_id von Anfang an korrekt zu füllen. Fehlt das Feld beim
-- Schreiben, fällt es hier sofort auf.
--
-- Datenschutz: Diese Views liefern ausschließlich Kennzahlen je TRAINER.
-- Keine Klientennamen, keine Gewichte, keine Fotos, keine Check-in-Inhalte.
-- Qualitätssicherung, nicht Überwachung.
-- =====================================================================

-- Aktivität je Trainer über die letzten 30 Tage.
create or replace view qa_coach_activity as
select
  c.id                                   as coach_id,
  c.organisation_id,
  c.display_name,
  count(distinct cl.id) filter (where cl.status = 'active')  as active_clients,
  count(distinct s.id)                                        as sessions_30d,
  count(distinct s.client_id)                                 as clients_training_30d,
  count(distinct a.id) filter (where a.status = 'completed')  as appointments_completed_30d,
  count(distinct a.id) filter (where a.status = 'no_show')    as appointments_no_show_30d,
  max(s.performed_at)                                         as last_session_at
from coaches c
left join clients cl
  on cl.coach_id = c.id
left join sessions s
  on s.coach_id = c.id and s.performed_at > now() - interval '30 days'
left join appointments a
  on a.coach_id = c.id and a.starts_at > now() - interval '30 days'
group by c.id, c.organisation_id, c.display_name;

-- Reaktionsgeschwindigkeit auf Check-ins — Kernindikator für Betreuungsqualität.
create or replace view qa_coach_responsiveness as
select
  ci.coach_id,
  c.organisation_id,
  count(*)                                                        as checkins_30d,
  count(*) filter (where ci.coach_replied_at is not null)          as replied_30d,
  round(avg(extract(epoch from (ci.coach_replied_at - ci.submitted_at)) / 3600)::numeric, 1)
                                                                  as avg_reply_hours
from check_ins ci
join coaches c on c.id = ci.coach_id
where ci.submitted_at > now() - interval '30 days'
group by ci.coach_id, c.organisation_id;

-- Bindung: Wie viele Klienten sind nach 90 Tagen noch aktiv?
create or replace view qa_coach_retention as
select
  cl.coach_id,
  cl.organisation_id,
  count(*)                                                                   as cohort_size,
  count(*) filter (where cl.status = 'active')                               as still_active,
  round(
    100.0 * count(*) filter (where cl.status = 'active') / nullif(count(*), 0),
    1
  )                                                                          as retention_percent
from clients cl
where cl.started_on <= current_date - interval '90 days'
group by cl.coach_id, cl.organisation_id;

-- Views erben RLS der Basistabellen nicht automatisch — daher security_invoker,
-- damit die Policies des aufrufenden Nutzers greifen.
alter view qa_coach_activity       set (security_invoker = on);
alter view qa_coach_responsiveness set (security_invoker = on);
alter view qa_coach_retention      set (security_invoker = on);
