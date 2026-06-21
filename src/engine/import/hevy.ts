// Pure parser for the Hevy workout CSV export (one row per set).
// The feature layer feeds already-parsed rows (e.g. from papaparse) so this
// module stays dependency-free and unit-testable.

export interface HevyRow {
  title: string
  start_time: string
  end_time: string
  description: string
  exercise_title: string
  superset_id: string
  exercise_notes: string
  set_index: string
  set_type: string
  weight_kg: string
  reps: string
  distance_km: string
  duration_seconds: string
  rpe: string
}

export interface ParsedSet {
  exerciseTitle: string
  exerciseNotes: string | null
  supersetId: string | null
  setIndex: number
  setType: string
  weightKg: number | null
  reps: number | null
  distanceKm: number | null
  durationSeconds: number | null
  rpe: number | null
}

export interface ParsedWorkout {
  title: string
  startedAt: string // ISO
  endedAt: string | null // ISO
  logDate: string // YYYY-MM-DD
  notes: string | null
  externalHash: string // title|startedAt — dedup key on re-import
  sets: ParsedSet[]
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

/** Parse Hevy's "20 Jun 2026, 12:19" into an ISO timestamp. Returns null if unparseable. */
export function parseHevyDateTime(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2}) (\w{3}) (\d{4}),?\s+(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const [, d, mon, y, h, min] = m
  const mm = MONTHS[mon]
  if (!mm) return null
  return `${y}-${mm}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min}:00`
}

function num(v: string): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Group flat Hevy rows into workouts (keyed by title + start_time). */
export function groupHevyRows(rows: HevyRow[]): ParsedWorkout[] {
  const byKey = new Map<string, ParsedWorkout>()

  for (const r of rows) {
    if (!r.exercise_title) continue
    const startedAt = parseHevyDateTime(r.start_time)
    if (!startedAt) continue
    const key = `${r.title}|${startedAt}`

    let w = byKey.get(key)
    if (!w) {
      w = {
        title: r.title || 'Workout',
        startedAt,
        endedAt: parseHevyDateTime(r.end_time),
        logDate: startedAt.slice(0, 10),
        notes: r.description?.trim() || null,
        externalHash: key,
        sets: [],
      }
      byKey.set(key, w)
    }

    w.sets.push({
      exerciseTitle: r.exercise_title,
      exerciseNotes: r.exercise_notes?.trim() || null,
      supersetId: r.superset_id?.trim() || null,
      setIndex: num(r.set_index) ?? 0,
      setType: r.set_type || 'normal',
      weightKg: num(r.weight_kg),
      reps: num(r.reps),
      distanceKm: num(r.distance_km),
      durationSeconds: num(r.duration_seconds),
      rpe: num(r.rpe),
    })
  }

  return [...byKey.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}
