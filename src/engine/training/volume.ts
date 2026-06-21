import { oneRepMaxEpley } from '../training'
import type { MuscleGroup } from './muscles'

export interface VolumePoint {
  date: string // YYYY-MM-DD
  exerciseTitle: string
  muscle: MuscleGroup
  weightKg: number | null
  reps: number | null
  setType: string
}

/** Working-set volume load (kg·reps). Warmups and cardio sets count as 0. */
export function setVolumeLoad(p: VolumePoint): number {
  if (p.setType === 'warmup' || p.weightKg == null || p.reps == null) return 0
  return p.weightKg * p.reps
}

/** Monday (UTC) of the week containing the given YYYY-MM-DD date. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7 // days since Monday
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

function sortedWeeks(points: VolumePoint[]): string[] {
  const set = new Set(points.map((p) => weekStart(p.date)))
  return [...set].sort()
}

/**
 * Weekly volume per muscle group, shaped for a multi-series chart:
 * [{ week, chest: 1200, back: 900, ... }]. Every muscle present gets a key
 * (0-filled) so lines are continuous.
 */
export function weeklyVolumeByMuscle(points: VolumePoint[]): {
  weeks: { week: string; [muscle: string]: number | string }[]
  muscles: MuscleGroup[]
} {
  const weeks = sortedWeeks(points)
  const muscles = [...new Set(points.map((p) => p.muscle))].sort() as MuscleGroup[]
  const index = new Map(weeks.map((w) => [w, Object.fromEntries(muscles.map((m) => [m, 0])) as Record<string, number>]))

  for (const p of points) {
    const row = index.get(weekStart(p.date))!
    row[p.muscle] += setVolumeLoad(p)
  }

  return {
    muscles,
    weeks: weeks.map((week) => ({ week, ...index.get(week)! })),
  }
}

export interface ExerciseWeekPoint {
  week: string
  volume: number
  sets: number
  est1rm: number // best estimated 1RM that week
}

/** Weekly volume, working-set count, and best estimated 1RM for one exercise. */
export function weeklyExerciseSeries(points: VolumePoint[], exerciseTitle: string): ExerciseWeekPoint[] {
  const mine = points.filter((p) => p.exerciseTitle === exerciseTitle)
  const byWeek = new Map<string, ExerciseWeekPoint>()

  for (const p of mine) {
    const wk = weekStart(p.date)
    let row = byWeek.get(wk)
    if (!row) {
      row = { week: wk, volume: 0, sets: 0, est1rm: 0 }
      byWeek.set(wk, row)
    }
    const vol = setVolumeLoad(p)
    row.volume += vol
    if (p.setType !== 'warmup' && p.weightKg != null && p.reps != null) {
      row.sets += 1
      row.est1rm = Math.max(row.est1rm, oneRepMaxEpley(p.weightKg, p.reps))
    }
  }

  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week))
}

/** Distinct exercise titles present, sorted. */
export function exerciseList(points: VolumePoint[]): string[] {
  return [...new Set(points.map((p) => p.exerciseTitle))].sort()
}
