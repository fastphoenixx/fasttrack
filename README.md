# FastTrack

Local-first-friendly tracker for diet, training, body measurements, fasting, and
tasks — built for gym-goers and, specifically, people who do extended / water fasts.

- **Engine** (`src/engine`) — pure, tested calculators: BMR (Mifflin / Harris-Benedict /
  Katch-McArdle), TDEE, macros, US-Navy body fat, LBM/FFMI, training volume, 1RM,
  cumulative energy & protein balance, mass-change projection.
- **Data** (Supabase Postgres) — versioned `profiles`, daily `daily_logs`, Kanban `tasks`,
  all locked down per-user with RLS. Schema in `supabase/migrations/`.
- **App** — React 19 + TS + Tailwind v4 + Vite PWA. Dashboard, daily-log Register,
  calculators (work offline, no backend), and a simple Kanban.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 — Calculators work with no setup
npm test           # engine unit tests
npm run build      # type-check + production PWA build
```

## Connect your Supabase project

1. Create a **personal** Supabase project (not a client org).
2. Apply the schema: `supabase/migrations/0001_init.sql` (via CLI `supabase db push`
   or paste into the SQL editor).
3. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. Restart `npm run dev`. Logging, Dashboard, Profile, and Tasks light up; sign in via
   magic link.

## Roadmap

- **Phase 1 (done):** engine, schema, calculators, Register flow, dashboard, CSV, Kanban.
- **Phase 2:** water-fast layer — electrolyte targets/warnings, micronutrient watch-list,
  refeeding-syndrome safety, ketosis/autophagy estimate.
- **Phase 3:** projection engine (forward trajectory + what-if), training-volume module,
  and the n8n Telegram audio→task pipeline (voice note → transcription → structured task).
