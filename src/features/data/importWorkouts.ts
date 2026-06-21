import Papa from 'papaparse'
import { db } from '../../db/client'
import { getImportedHashes } from '../../db/queries'
import { groupHevyRows, type HevyRow, type ParsedWorkout } from '../../engine/import/hevy'
import { classifyExercise } from '../../engine/training/muscles'
import type { WorkoutRow, WorkoutSetInsert } from '../../db/types'

export interface ImportSummary {
  parsedWorkouts: number
  parsedSets: number
  newWorkouts: number
  skipped: number
  insertedSets: number
}

/** Parse a Hevy CSV string into workouts (pure-ish: parsing only). */
export function parseHevyCsv(text: string): ParsedWorkout[] {
  const { data } = Papa.parse<HevyRow>(text, { header: true, skipEmptyLines: true })
  return groupHevyRows(data)
}

async function insertSetsChunked(rows: WorkoutSetInsert[], chunk = 200): Promise<void> {
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await db.from('workout_sets').insert(rows.slice(i, i + chunk))
    if (error) throw error
  }
}

/**
 * Import parsed workouts: skip any whose external_hash already exists, insert
 * the new workouts, then insert their sets (muscle group classified here).
 */
export async function importWorkouts(workouts: ParsedWorkout[]): Promise<ImportSummary> {
  const parsedSets = workouts.reduce((n, w) => n + w.sets.length, 0)
  const existing = await getImportedHashes()
  const fresh = workouts.filter((w) => !existing.has(w.externalHash))

  if (fresh.length === 0) {
    return { parsedWorkouts: workouts.length, parsedSets, newWorkouts: 0, skipped: workouts.length, insertedSets: 0 }
  }

  const { data: inserted, error } = await db
    .from('workouts')
    .insert(
      fresh.map((w) => ({
        title: w.title,
        started_at: w.startedAt,
        ended_at: w.endedAt,
        log_date: w.logDate,
        notes: w.notes,
        external_hash: w.externalHash,
      })),
    )
    .select('id,external_hash')
  if (error) throw error

  const idByHash = new Map((inserted as Pick<WorkoutRow, 'id' | 'external_hash'>[]).map((r) => [r.external_hash, r.id]))

  const setRows: WorkoutSetInsert[] = []
  for (const w of fresh) {
    const workoutId = idByHash.get(w.externalHash)
    if (!workoutId) continue
    for (const s of w.sets) {
      setRows.push({
        workout_id: workoutId,
        exercise_title: s.exerciseTitle,
        muscle_group: classifyExercise(s.exerciseTitle),
        exercise_notes: s.exerciseNotes,
        superset_id: s.supersetId,
        set_index: s.setIndex,
        set_type: s.setType,
        weight_kg: s.weightKg,
        reps: s.reps,
        distance_km: s.distanceKm,
        duration_seconds: s.durationSeconds,
        rpe: s.rpe,
      })
    }
  }

  await insertSetsChunked(setRows)

  return {
    parsedWorkouts: workouts.length,
    parsedSets,
    newWorkouts: fresh.length,
    skipped: workouts.length - fresh.length,
    insertedSets: setRows.length,
  }
}
