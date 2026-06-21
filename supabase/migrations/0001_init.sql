-- FastTrack schema — plain Postgres + PostgREST (single-user, token-gated).
-- Applied to a dedicated `fasttrack` database in the existing postgres:14 cluster.
-- No Supabase auth schema: ownership is enforced by the bearer token at the API edge.

-- ---------------------------------------------------------------------------
-- Roles for PostgREST. `fasttrack_auth` is the connecting (authenticator) role;
-- it switches into `fasttrack_user` (full access) or `fasttrack_anon` (none)
-- based on the JWT `role` claim.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select from pg_roles where rolname = 'fasttrack_anon') then
    create role fasttrack_anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'fasttrack_user') then
    create role fasttrack_user nologin;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- profiles: versioned snapshots (newest effective_date <= today wins).
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  effective_date  date not null default current_date,
  sex             text not null check (sex in ('male', 'female')),
  birthdate       date,
  height_cm       numeric(5, 1),
  activity_level  text not null default 'moderate'
                    check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal            text not null default 'maintain' check (goal in ('cut','maintain','bulk')),
  protein_per_kg  numeric(4, 2) not null default 2.0,
  fat_fraction    numeric(4, 3) not null default 0.250,
  bmr_formula     text not null default 'mifflin'
                    check (bmr_formula in ('mifflin','harris_benedict','katch_mcardle')),
  created_at      timestamptz not null default now()
);
create index if not exists profiles_date_idx on profiles (effective_date desc);

-- ---------------------------------------------------------------------------
-- daily_logs: one row per day — the temporal spine.
-- ---------------------------------------------------------------------------
create table if not exists daily_logs (
  id              uuid primary key default gen_random_uuid(),
  log_date        date not null unique,
  calories_in     numeric(7, 1),
  protein_g       numeric(6, 1),
  carb_g          numeric(6, 1),
  fat_g           numeric(6, 1),
  water_ml        numeric(7, 0),
  weight_kg       numeric(5, 2),
  measurements    jsonb not null default '{}'::jsonb,
  fasting_hours   numeric(4, 1),
  fast_type       text check (fast_type in ('none','intermittent','omad','extended_water','dry','religious')),
  electrolytes    jsonb not null default '{}'::jsonb,
  micronutrients  jsonb not null default '{}'::jsonb,
  training        jsonb not null default '[]'::jsonb,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists daily_logs_date_idx on daily_logs (log_date desc);

-- ---------------------------------------------------------------------------
-- tasks: the Kanban board. external_id holds the WhatsApp taskbot fingerprint
-- so the n8n bridge can upsert taskbot tasks here without duplicating.
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  status          text not null default 'inbox' check (status in ('inbox','doing','done')),
  due_date        date,
  urgency         text not null default 'medium' check (urgency in ('low','medium','high')),
  assignee        text,
  source          text not null default 'manual' check (source in ('manual','audio','telegram','whatsapp')),
  external_id     text unique,                          -- taskbot fingerprint, when bridged
  raw_transcript  text,
  position        numeric not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists tasks_status_idx on tasks (status, position);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_logs_touch on daily_logs;
create trigger daily_logs_touch before update on daily_logs
  for each row execute function touch_updated_at();
drop trigger if exists tasks_touch on tasks;
create trigger tasks_touch before update on tasks
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Grants: the user role gets full CRUD; anon gets nothing.
-- ---------------------------------------------------------------------------
grant usage on schema public to fasttrack_user;
grant select, insert, update, delete on all tables in schema public to fasttrack_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to fasttrack_user;
