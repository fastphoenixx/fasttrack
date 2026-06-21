// Row shapes mirroring supabase/migrations/0001_init.sql.
import type { ActivityLevel, BmrFormula, Goal, Sex } from '../engine/types'

export type FastType =
  | 'none'
  | 'intermittent'
  | 'omad'
  | 'extended_water'
  | 'dry'
  | 'religious'

export type TaskStatus = 'inbox' | 'doing' | 'done'
export type Urgency = 'low' | 'medium' | 'high'
export type TaskSource = 'manual' | 'audio' | 'telegram' | 'whatsapp'

export interface ProfileRow {
  id: string
  effective_date: string
  sex: Sex
  birthdate: string | null
  height_cm: number | null
  activity_level: ActivityLevel
  goal: Goal
  protein_per_kg: number
  fat_fraction: number
  bmr_formula: BmrFormula
  created_at: string
}

export interface Measurements {
  waist?: number
  neck?: number
  hip?: number
  arm?: number
  thigh?: number
  chest?: number
  [key: string]: number | undefined
}

export interface Electrolytes {
  sodium_mg?: number
  potassium_mg?: number
  magnesium_mg?: number
}

/** Micronutrients commonly depleted during extended fasting (water-fast layer). */
export interface Micronutrients {
  thiamine_b1_mg?: number
  vitamin_c_mg?: number
  b_complex_mg?: number
  [key: string]: number | undefined
}

export interface DailyLogRow {
  id: string
  log_date: string
  calories_in: number | null
  protein_g: number | null
  carb_g: number | null
  fat_g: number | null
  water_ml: number | null
  weight_kg: number | null
  measurements: Measurements
  fasting_hours: number | null
  fast_type: FastType | null
  electrolytes: Electrolytes
  micronutrients: Micronutrients
  training: unknown[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaskRow {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  urgency: Urgency
  assignee: string | null
  source: TaskSource
  external_id: string | null
  raw_transcript: string | null
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface FastRow {
  id: string
  fast_type: FastType
  started_at: string
  target_hours: number | null
  ended_at: string | null
  broke_note: string | null
  created_at: string
}

export type FastInput = Partial<Omit<FastRow, 'id' | 'created_at'>> & {
  fast_type: FastType
  started_at: string
}

export interface WorkoutRow {
  id: string
  title: string
  started_at: string
  ended_at: string | null
  log_date: string
  notes: string | null
  external_hash: string | null
  created_at: string
}

export interface WorkoutSetInsert {
  workout_id: string
  exercise_title: string
  muscle_group: string
  exercise_notes: string | null
  superset_id: string | null
  set_index: number
  set_type: string
  weight_kg: number | null
  reps: number | null
  distance_km: number | null
  duration_seconds: number | null
  rpe: number | null
}

/** Writable shapes (omit server-managed columns). */
export type DailyLogInput = Partial<
  Omit<DailyLogRow, 'id' | 'created_at' | 'updated_at'>
> & { log_date: string }

export type TaskInput = Partial<
  Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>
> & { title: string }
