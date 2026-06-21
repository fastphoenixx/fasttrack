// Shared domain types for the calculator engine.
// All functions in src/engine are pure: no I/O, no dates, no globals.

export type Sex = 'male' | 'female'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type Goal = 'cut' | 'maintain' | 'bulk'

export type BmrFormula = 'mifflin' | 'harris_benedict' | 'katch_mcardle'

/** Activity multipliers applied to BMR to estimate TDEE. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** Energy density of macronutrients in kcal per gram. */
export const KCAL_PER_GRAM = {
  protein: 4,
  carb: 4,
  fat: 9,
} as const

/** Approximate energy in one kilogram of body fat (kcal). A model, not gospel. */
export const KCAL_PER_KG_FAT = 7700
