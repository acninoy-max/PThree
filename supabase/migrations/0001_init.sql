-- =====================================================================
-- PT FIVE — Grundschema
--
-- Zwei Prinzipien, die hier fest verdrahtet sind:
--   1. Mandantentrennung auf Datenbankebene. Ein Coach sieht strukturell nur
--      seine eigenen Klienten — nicht, weil die App richtig filtert, sondern
--      weil Postgres nichts anderes herausgibt.
--   2. organisation_id liegt überall an, wo später je Kette aggregiert wird.
--      Nachträglich wäre die Historie nicht mehr zuzuordnen.
--
-- Gesundheitsdaten (Gewicht, Fotos, Maße) sind besondere Kategorie nach
-- Art. 9 DSGVO. Dateien gehören in privaten Storage mit signierten URLs,
-- niemals in öffentliche Buckets.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------- Aufzählungstypen ----------
create type movement_pattern as enum ('push', 'pull', 'squat', 'hinge', 'overhead');
create type training_block   as enum ('compound', 'functional', 'isolation', 'core');
create type experience_level as enum ('beginner', 'intermediate', 'pro');
create type user_role        as enum ('coach', 'athlete', 'org_admin');
create type client_status    as enum ('active', 'paused', 'archived');
create type appt_location    as enum ('gym', 'park', 'home', 'online');
create type appt_status      as enum ('scheduled', 'completed', 'rescheduled', 'cancelled', 'no_show');

-- ---------- Organisationen ----------
create table organisations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- ---------- Profile (1:1 zu auth.users) ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  full_name   text not null,
  email       text not null,
  avatar_url  text,
  locale      text not null default 'de',
  created_at  timestamptz not null default now()
);

create table coaches (
  id              uuid primary key references profiles(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete set null,
  display_name    text not null,
  bio             text,
  brand_logo_url  text,
  timezone        text not null default 'Europe/Amsterdam',
  created_at      timestamptz not null default now()
);
create index on coaches (organisation_id);

-- ---------- Klienten ----------
create table clients (
  id              uuid primary key default uuid_generate_v4(),
  coach_id        uuid not null references coaches(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete set null,
  profile_id      uuid references profiles(id) on delete set null,
  full_name       text not null,
  email           text,
  status          client_status not null default 'active',
  level           experience_level not null default 'beginner',
  goal            text,
  started_on      date not null default current_date,
  created_at      timestamptz not null default now()
);
create index on clients (coach_id, status);
create index on clients (organisation_id);
create index on clients (profile_id);

-- Einladungen: Klient existiert, bevor er sich registriert.
create table client_invites (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz
);

-- ---------- Übungsbibliothek ----------
create table exercises (
  id                uuid primary key default uuid_generate_v4(),
  coach_id          uuid references coaches(id) on delete cascade, -- null = global
  name              text not null,
  pattern           movement_pattern not null,
  default_block     training_block not null,
  cue               text,
  common_fault      text,
  is_bodyweight     boolean not null default false,
  regression_of_id  uuid references exercises(id) on delete set null,
  progression_of_id uuid references exercises(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index on exercises (pattern);
create index on exercises (coach_id);

-- ---------- Vorlagen und Pläne ----------
create table templates (
  id          uuid primary key default uuid_generate_v4(),
  coach_id    uuid references coaches(id) on delete cascade, -- null = mitgeliefert
  name        text not null,
  level       experience_level not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table plans (
  id          uuid primary key default uuid_generate_v4(),
  coach_id    uuid not null references coaches(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  name        text not null,
  level       experience_level not null,
  starts_on   date not null default current_date,
  ends_on     date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on plans (client_id, is_active);

-- Tage gehören entweder zu einer Vorlage oder zu einem Plan, nie zu beidem.
create table plan_days (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid references plans(id) on delete cascade,
  template_id uuid references templates(id) on delete cascade,
  position    int not null,
  title       text not null,
  constraint plan_days_owner check (num_nonnulls(plan_id, template_id) = 1)
);

create table plan_slots (
  id                  uuid primary key default uuid_generate_v4(),
  plan_day_id         uuid not null references plan_days(id) on delete cascade,
  position            int not null,
  pattern             movement_pattern not null,
  block               training_block not null,
  label               text not null,
  default_exercise_id uuid references exercises(id) on delete set null,
  target_sets         int not null default 3,
  target_reps_min     int not null default 8,
  target_reps_max     int not null default 12,
  superset_group      text,
  note                text
);
create index on plan_slots (plan_day_id, position);

-- ---------- Durchgeführte Einheiten ----------
create table sessions (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references clients(id) on delete cascade,
  coach_id         uuid not null references coaches(id) on delete cascade,
  organisation_id  uuid references organisations(id) on delete set null,
  plan_id          uuid references plans(id) on delete set null,
  plan_day_id      uuid references plan_days(id) on delete set null,
  title            text not null,
  performed_at     timestamptz not null default now(),
  is_self_directed boolean not null default false,
  notes            text
);
create index on sessions (client_id, performed_at desc);
create index on sessions (coach_id, performed_at desc);

create table session_slots (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references sessions(id) on delete cascade,
  plan_slot_id uuid references plan_slots(id) on delete set null,
  pattern      movement_pattern not null,
  block        training_block not null,
  exercise_id  uuid not null references exercises(id),
  position     int not null
);
-- Trägt die Musterauswertung: Historie je Muster über alle Übungen hinweg.
create index on session_slots (session_id, position);
create index on session_slots (pattern);

create table session_sets (
  id              uuid primary key default uuid_generate_v4(),
  session_slot_id uuid not null references session_slots(id) on delete cascade,
  set_number      int not null,
  weight_kg       numeric(6,2) not null default 0,
  reps            int not null,
  is_bodyweight   boolean not null default false,
  rpe             numeric(3,1),
  constraint session_sets_reps_positive check (reps > 0)
);
create index on session_sets (session_slot_id, set_number);

-- ---------- Termine ----------
create table appointments (
  id                   uuid primary key default uuid_generate_v4(),
  coach_id             uuid not null references coaches(id) on delete cascade,
  client_id            uuid not null references clients(id) on delete cascade,
  organisation_id      uuid references organisations(id) on delete set null,
  starts_at            timestamptz not null,
  duration_minutes     int not null default 60,
  location             appt_location not null default 'gym',
  location_note        text,
  status               appt_status not null default 'scheduled',
  plan_day_id          uuid references plan_days(id) on delete set null,
  recurrence_rule      text,
  recurrence_parent_id uuid references appointments(id) on delete cascade,
  notes                text,
  created_at           timestamptz not null default now()
);
create index on appointments (coach_id, starts_at);
create index on appointments (client_id, starts_at);

-- ---------- Check-ins, Nachrichten, Körperwerte ----------
create table check_in_configs (
  client_id      uuid primary key references clients(id) on delete cascade,
  ask_weight     boolean not null default true,
  ask_photos     boolean not null default false,
  ask_energy     boolean not null default true,
  ask_sleep      boolean not null default true,
  ask_stress     boolean not null default true,
  ask_free_text  boolean not null default true,
  due_weekday    int not null default 7
);

create table check_ins (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references clients(id) on delete cascade,
  coach_id         uuid not null references coaches(id) on delete cascade,
  week_of          date not null,
  submitted_at     timestamptz,
  weight_kg        numeric(5,2),
  energy           int check (energy between 1 and 5),
  sleep            int check (sleep between 1 and 5),
  stress           int check (stress between 1 and 5),
  client_note      text,
  photo_paths      text[],
  coach_reply      text,
  coach_replied_at timestamptz,
  unique (client_id, week_of)
);
create index on check_ins (coach_id, submitted_at desc);

create table body_metrics (
  id                uuid primary key default uuid_generate_v4(),
  client_id         uuid not null references clients(id) on delete cascade,
  recorded_on       date not null,
  weight_kg         numeric(5,2),
  body_fat_percent  numeric(4,1),
  measurements      jsonb,
  photo_paths       text[],
  unique (client_id, recorded_on)
);

create table messages (
  id                uuid primary key default uuid_generate_v4(),
  coach_id          uuid not null references coaches(id) on delete cascade,
  client_id         uuid not null references clients(id) on delete cascade,
  sender_profile_id uuid not null references profiles(id) on delete cascade,
  body              text not null,
  sent_at           timestamptz not null default now(),
  read_at           timestamptz
);
create index on messages (client_id, sent_at desc);

-- ---------- Ernährung (bewusst schlank) ----------
create table nutrition_targets (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references clients(id) on delete cascade,
  coach_id   uuid not null references coaches(id) on delete cascade,
  kcal       int,
  protein_g  int,
  carbs_g    int,
  fat_g      int,
  valid_from date not null default current_date
);

create table nutrition_logs (
  id        uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  logged_on date not null,
  kcal      int,
  protein_g int,
  carbs_g   int,
  fat_g     int,
  unique (client_id, logged_on)
);
