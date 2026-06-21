import { weekStart } from './training/volume'

const WEEK_MS = 7 * 86_400_000

function isNextWeek(a: string, b: string): boolean {
  return new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime() === WEEK_MS
}

/**
 * Week-based logging streak: consecutive ISO weeks (Mon-anchored) that contain
 * at least one logged date. Week-not-day is forgiving — it avoids the
 * all-or-nothing daily-streak quit spiral (Hevy's approach). Pure: `asOf` is
 * passed in. Returns current (alive if this week OR last week has an entry) and
 * the best run ever.
 */
export function weekStreak(dates: string[], asOf: string): { current: number; best: number } {
  const weeks = [...new Set(dates.map(weekStart))].sort()
  if (!weeks.length) return { current: 0, best: 0 }

  const best = weeks.reduce(
    (acc, w, i) => {
      const run = i > 0 && isNextWeek(weeks[i - 1], w) ? acc.run + 1 : 1
      return { run, best: Math.max(acc.best, run) }
    },
    { run: 0, best: 0 },
  ).best

  const have = new Set(weeks)
  const thisWeek = weekStart(asOf)
  const lastWeek = new Date(new Date(`${thisWeek}T00:00:00Z`).getTime() - WEEK_MS).toISOString().slice(0, 10)
  // The streak is "alive" if logged this week or last week; count back from there.
  let anchor = have.has(thisWeek) ? thisWeek : have.has(lastWeek) ? lastWeek : null
  let current = 0
  while (anchor && have.has(anchor)) {
    current += 1
    anchor = new Date(new Date(`${anchor}T00:00:00Z`).getTime() - WEEK_MS).toISOString().slice(0, 10)
  }
  return { current, best }
}
