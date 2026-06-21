-- Active/continuous fasts. A fast is a real timestamp interval (it spans
-- midnight, timezones, DST) — distinct from the date-keyed daily_logs.fasting_hours.
-- ended_at IS NULL ⇒ the fast is currently running.

create table if not exists fasts (
  id            uuid primary key default gen_random_uuid(),
  fast_type     text not null default 'extended_water'
                  check (fast_type in ('none','intermittent','omad','extended_water','dry','religious')),
  started_at    timestamptz not null,
  target_hours  numeric(5, 1),
  ended_at      timestamptz,
  broke_note    text,
  created_at    timestamptz not null default now()
);

create index if not exists fasts_active_idx on fasts (ended_at, started_at desc);

grant select, insert, update, delete on fasts to fasttrack_user;
