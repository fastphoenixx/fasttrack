-- Measured fasting biomarkers (optional, user-entered) + persisted screening.

alter table daily_logs
  add column if not exists measured_bhb_mmol     numeric(4, 2),
  add column if not exists measured_glucose_mgdl numeric(5, 1);

-- Versioned screening: newest row is the current result (history kept).
create table if not exists screening (
  id          uuid primary key default gen_random_uuid(),
  items       jsonb not null default '[]'::jsonb,  -- selected risk-item keys
  score       numeric(4, 1) not null default 0,
  band        text not null default 'low' check (band in ('low', 'moderate', 'high')),
  created_at  timestamptz not null default now()
);
create index if not exists screening_created_idx on screening (created_at desc);

grant select, insert, update, delete on screening to fasttrack_user;
