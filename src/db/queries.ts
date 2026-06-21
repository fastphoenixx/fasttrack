import { db } from './client'
import type {
  DailyLogInput,
  DailyLogRow,
  FastInput,
  FastRow,
  ProfileRow,
  TaskInput,
  TaskRow,
  TaskStatus,
} from './types'
import type { VolumePoint } from '../engine/training/volume'
import type { MuscleGroup } from '../engine/training/muscles'

// --- profiles -------------------------------------------------------------

/** The profile version in effect on a given date (defaults to today). */
export async function getCurrentProfile(onDate?: string): Promise<ProfileRow | null> {
  const ref = onDate ?? new Date().toISOString().slice(0, 10)
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .lte('effective_date', ref)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveProfile(
  profile: Omit<ProfileRow, 'id' | 'created_at'>,
): Promise<ProfileRow> {
  const { data, error } = await db.from('profiles').insert(profile).select().single()
  if (error) throw error
  return data
}

// --- daily logs -----------------------------------------------------------

export async function getLogRange(from: string, to: string): Promise<DailyLogRow[]> {
  const { data, error } = await db
    .from('daily_logs')
    .select('*')
    .gte('log_date', from)
    .lte('log_date', to)
    .order('log_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Every log, newest first — the full historical base. */
export async function getAllLogs(): Promise<DailyLogRow[]> {
  const { data, error } = await db
    .from('daily_logs')
    .select('*')
    .order('log_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLog(logDate: string): Promise<DailyLogRow | null> {
  const { data, error } = await db
    .from('daily_logs')
    .select('*')
    .eq('log_date', logDate)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Upsert today's (or any day's) log — the Register button. */
export async function upsertLog(input: DailyLogInput): Promise<DailyLogRow> {
  const { data, error } = await db
    .from('daily_logs')
    .upsert(input, { onConflict: 'log_date' })
    .select()
    .single()
  if (error) throw error
  return data
}

// --- tasks ----------------------------------------------------------------

export async function listTasks(): Promise<TaskRow[]> {
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .order('status', { ascending: true })
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTask(input: TaskInput): Promise<TaskRow> {
  const { data, error } = await db.from('tasks').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<TaskRow> {
  const { data, error } = await db.from('tasks').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function moveTask(id: string, status: TaskStatus, position: number): Promise<TaskRow> {
  const patch: Partial<TaskInput> = { status, position }
  if (status === 'done') patch.completed_at = new Date().toISOString()
  return updateTask(id, patch)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// --- fasts (active timer) -------------------------------------------------

/** The currently-running fast (ended_at null), or null if none. */
export async function getActiveFast(): Promise<FastRow | null> {
  const { data, error } = await db
    .from('fasts')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function startFast(input: FastInput): Promise<FastRow> {
  const { data, error } = await db.from('fasts').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateFast(id: string, patch: Partial<FastInput>): Promise<FastRow> {
  const { data, error } = await db.from('fasts').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function endFast(id: string, endedAt: string, note?: string): Promise<FastRow> {
  return updateFast(id, { ended_at: endedAt, broke_note: note ?? null })
}

export async function listFasts(): Promise<FastRow[]> {
  const { data, error } = await db.from('fasts').select('*').order('started_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// --- workouts / volume ----------------------------------------------------

interface SetWithDate {
  exercise_title: string
  muscle_group: string
  set_type: string
  weight_kg: number | null
  reps: number | null
  workouts: { log_date: string } | null
}

/** Every set joined to its workout's date — the input for volume analytics. */
export async function getVolumePoints(): Promise<VolumePoint[]> {
  const { data, error } = await db
    .from('workout_sets')
    .select('exercise_title,muscle_group,set_type,weight_kg,reps,workouts(log_date)')
  if (error) throw error
  return ((data ?? []) as unknown as SetWithDate[])
    .filter((r) => r.workouts?.log_date)
    .map((r) => ({
      date: r.workouts!.log_date,
      exerciseTitle: r.exercise_title,
      muscle: r.muscle_group as MuscleGroup,
      weightKg: r.weight_kg,
      reps: r.reps,
      setType: r.set_type,
    }))
}

/** External hashes already imported, so re-imports skip existing workouts. */
export async function getImportedHashes(): Promise<Set<string>> {
  const { data, error } = await db.from('workouts').select('external_hash')
  if (error) throw error
  return new Set((data ?? []).map((r: { external_hash: string | null }) => r.external_hash ?? ''))
}
