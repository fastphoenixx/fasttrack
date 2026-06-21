import type { BmrFormula, Sex } from './types'

export interface BmrInput {
  sex: Sex
  weightKg: number
  heightCm: number
  ageYears: number
  /** Body-fat fraction (0..1). Required only for the Katch-McArdle formula. */
  bodyFatFraction?: number
}

/** Mifflin-St Jeor (1990) — the modern default, validated for general use. */
export function bmrMifflin({ sex, weightKg, heightCm, ageYears }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return sex === 'male' ? base + 5 : base - 161
}

/** Revised Harris-Benedict (Roza & Shizgal, 1984). */
export function bmrHarrisBenedict({ sex, weightKg, heightCm, ageYears }: BmrInput): number {
  return sex === 'male'
    ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
    : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears
}

/**
 * Katch-McArdle — based on lean body mass, the most accurate when body-fat % is
 * known. Requires bodyFatFraction.
 */
export function bmrKatchMcArdle({ weightKg, bodyFatFraction }: BmrInput): number {
  if (bodyFatFraction == null || bodyFatFraction < 0 || bodyFatFraction >= 1) {
    throw new Error('bmrKatchMcArdle requires bodyFatFraction in [0, 1)')
  }
  const leanMass = weightKg * (1 - bodyFatFraction)
  return 370 + 21.6 * leanMass
}

export function bmr(formula: BmrFormula, input: BmrInput): number {
  switch (formula) {
    case 'mifflin':
      return bmrMifflin(input)
    case 'harris_benedict':
      return bmrHarrisBenedict(input)
    case 'katch_mcardle':
      return bmrKatchMcArdle(input)
  }
}
