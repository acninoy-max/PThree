-- ============================================================
-- 0027 — Feedback aus der App
-- ============================================================
--
-- Für den Test mit 5 bis 10 Trainern und ihren Klienten: Unter
-- „Profil" steht ein Freitextfeld. Was dort abgeschickt wird, landet
-- hier — und wird im SQL-Editor gelesen, nicht in der App:
--
--   select f.created_at, p.full_name, f.role, f.locale, f.message
--     from app_feedback f
--     left join profiles p on p.id = f.user_id
--    order by f.created_at desc;
--
-- WER DARF WAS
-- ------------
-- Schreiben: jeder Angemeldete, aber nur unter seiner eigenen ID.
-- Lesen: nur das eigene. Ändern und Löschen: niemand über die App — ein
-- Feedback ist eine Meldung, kein Dokument.
--
-- Die Rolle steht mit drin, damit man Trainer- und Klientenstimmen
-- auseinanderhalten kann, ohne bei jeder Zeile nachzuschlagen. Sie wird
-- von der Datenbank gesetzt, nicht vom Browser: Ein mitgeschickter Wert
-- wäre einer, den man fälschen kann.

create table if not exists app_feedback (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null default auth.uid()
              references profiles(id) on delete cascade,
  role        user_role,
  message     text not null,
  locale      text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  constraint app_feedback_message_laenge
    check (char_length(btrim(message)) between 1 and 4000)
);

create index if not exists app_feedback_created_idx
  on app_feedback (created_at desc);

alter table app_feedback enable row level security;

drop policy if exists app_feedback_insert_own on app_feedback;
create policy app_feedback_insert_own on app_feedback
  for insert with check (user_id = auth.uid());

drop policy if exists app_feedback_read_own on app_feedback;
create policy app_feedback_read_own on app_feedback
  for select using (user_id = auth.uid());

-- Die Rolle aus dem Profil übernehmen, egal was mitgeschickt wurde.
create or replace function app_feedback_set_role()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  select role into new.role from profiles where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists app_feedback_role on app_feedback;
create trigger app_feedback_role
  before insert on app_feedback
  for each row execute function app_feedback_set_role();

comment on table app_feedback is
  'Freitext-Feedback aus der App (0027). Lesen im SQL-Editor, nicht in der App.';
