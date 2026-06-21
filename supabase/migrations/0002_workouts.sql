-- Workouts (Hevy import). One row per workout session + one per set, mirroring
-- the Hevy CSV. muscle_group is denormalized at import time for easy analytics.

create table if not exists workouts (
  id             uuid primary key default gen_random_uuid(),
  title          text not null default 'Workout',
  started_at     timestamptz not null,
  ended_at       timestamptz,
  log_date       date not null,
  notes          text,
  external_hash  text unique,          -- title|started_at — dedup on re-import
  created_at     timestamptz not null default now()
);
create index if not exists workouts_date_idx on workouts (log_date desc);

create table if not exists workout_sets (
  id                uuid primary key default gen_random_uuid(),
  workout_id        uuid not null references workouts (id) on delete cascade,
  exercise_title    text not null,
  muscle_group      text not null default 'other',
  exercise_notes    text,
  superset_id       text,
  set_index         integer not null default 0,
  set_type          text not null default 'normal',
  weight_kg         numeric(7, 2),
  reps              numeric(5, 1),
  distance_km       numeric(7, 2),
  duration_seconds  numeric(8, 0),
  rpe               numeric(3, 1)
);
create index if not exists workout_sets_workout_idx on workout_sets (workout_id);
create index if not exists workout_sets_exercise_idx on workout_sets (exercise_title);
create index if not exists workout_sets_muscle_idx on workout_sets (muscle_group);

grant select, insert, update, delete on workouts, workout_sets to fasttrack_user;
