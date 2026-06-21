import { bmr } from './bmr'
import { tdee } from './tdee'
import type { ActivityLevel, BmrFormula, Sex } from './types'

/**
 * Whole years between a birthdate and a reference date (both ISO).
 * Pure — the reference date is passed in, never read from the clock.
 * Falls back to 30 when birthdate is unknown.
 */
export function ageYearsFrom(birthdate: string | null, asOf: string): number {
  if (!birthdate) return 30
  const b = new Date(birthdate)
  const a = new Date(asOf)
  let age = a.getUTCFullYear() - b.getUTCFullYear()
  const monthDiff = a.getUTCMonth() - b.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && a.getUTCDate() < b.getUTCDate())) age--
  return age
}

export interface ExpenditureInput {
  sex: Sex
  heightCm: number
  birthdate: string | null
  activity: ActivityLevel
  bmrFormula: BmrFormula
  weightKg: number
  /** Reference date (ISO) used to compute age. */
  asOf: string
  bodyFatFraction?: number
}

/** Estimate a day's expenditure (TDEE) from a profile snapshot + that day's weight. */
export function estimateExpenditure(i: ExpenditureInput): number {
  const b = bmr(i.bmrFormula, {
    sex: i.sex,
    weightKg: i.weightKg,
    heightCm: i.heightCm,
    ageYears: ageYearsFrom(i.birthdate, i.asOf),
    bodyFatFraction: i.bodyFatFraction ?? 0.2,
  })
  return tdee(b, i.activity)
}
