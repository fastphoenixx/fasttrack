import { KCAL_PER_GRAM } from './types'

export interface MacroTargets {
  calories: number
  proteinG: number
  fatG: number
  carbG: number
}

export interface MacroInput {
  /** Target daily calories. */
  calories: number
  /** Bodyweight (or lean mass) used to scale protein. */
  weightKg: number
  /** Protein target in grams per kg. Training default ~1.8–2.2. */
  proteinPerKg?: number
  /** Fraction of total calories from fat (0..1). */
  fatFraction?: number
}

/**
 * Split target calories into macros: protein scaled by bodyweight, fat as a
 * fraction of calories, carbs filling the remainder. Carbs are floored at 0.
 */
export function macroTargets({
  calories,
  weightKg,
  proteinPerKg = 2,
  fatFraction = 0.25,
}: MacroInput): MacroTargets {
  const proteinG = proteinPerKg * weightKg
  const fatG = (calories * fatFraction) / KCAL_PER_GRAM.fat
  const remaining = calories - proteinG * KCAL_PER_GRAM.protein - fatG * KCAL_PER_GRAM.fat
  const carbG = Math.max(0, remaining / KCAL_PER_GRAM.carb)
  return { calories, proteinG, fatG, carbG }
}

/** Total calories implied by a set of macro grams. */
export function caloriesFromMacros(proteinG: number, carbG: number, fatG: number): number {
  return (
    proteinG * KCAL_PER_GRAM.protein +
    carbG * KCAL_PER_GRAM.carb +
    fatG * KCAL_PER_GRAM.fat
  )
}
