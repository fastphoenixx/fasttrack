import { describe, expect, it } from 'vitest'
import { targetCalories, tdee } from './tdee'
import { caloriesFromMacros, macroTargets } from './macros'
import { bodyFatNavy } from './bodyfat'
import { ffmi, leanBodyMass, normalizedFfmi } from './composition'
import {
  oneRepMaxBrzycki,
  oneRepMaxEpley,
  totalVolume,
  weeklySetsPerMuscle,
} from './training'
import {
  cumulativeBalance,
  cumulativeProteinBalance,
  projectedMassChangeKg,
  totalDeficit,
  totalSurplus,
} from './balance'

describe('tdee', () => {
  it('applies the moderate activity factor', () => {
    expect(tdee(1780, 'moderate')).toBeCloseTo(2759, 0)
  })

  it('cut goal default trims 20%', () => {
    expect(targetCalories(2500, 'cut')).toBeCloseTo(2000, 0)
  })

  it('honours an explicit adjustment override', () => {
    expect(targetCalories(2500, 'cut', -0.25)).toBeCloseTo(1875, 0)
  })
})

describe('macroTargets', () => {
  it('scales protein by bodyweight and fills carbs with the remainder', () => {
    const t = macroTargets({ calories: 2000, weightKg: 80, proteinPerKg: 2, fatFraction: 0.25 })
    expect(t.proteinG).toBeCloseTo(160, 0) // 2 * 80
    expect(t.fatG).toBeCloseTo(55.56, 1) // 2000*0.25/9
    // remaining = 2000 - 640 - 500 = 860 kcal -> 215g carbs
    expect(t.carbG).toBeCloseTo(215, 0)
  })

  it('round-trips through caloriesFromMacros', () => {
    const t = macroTargets({ calories: 2000, weightKg: 80 })
    expect(caloriesFromMacros(t.proteinG, t.carbG, t.fatG)).toBeCloseTo(2000, 0)
  })

  it('floors carbs at zero when protein+fat exceed calories', () => {
    const t = macroTargets({ calories: 500, weightKg: 100, proteinPerKg: 2 })
    expect(t.carbG).toBe(0)
  })
})

describe('bodyFatNavy', () => {
  it('estimates male body fat from circumferences', () => {
    expect(bodyFatNavy({ sex: 'male', heightCm: 180, neckCm: 38, waistCm: 85 })).toBeCloseTo(16.1, 0)
  })

  it('requires hip for female subjects', () => {
    expect(() => bodyFatNavy({ sex: 'female', heightCm: 165, neckCm: 32, waistCm: 70 })).toThrow()
  })
})

describe('composition', () => {
  it('computes lean mass and FFMI', () => {
    const lbm = leanBodyMass(80, 0.15) // 68
    expect(lbm).toBeCloseTo(68, 0)
    expect(ffmi(lbm, 180)).toBeCloseTo(20.99, 1) // 68 / 1.8^2
  })

  it('normalizes FFMI toward 1.8m reference', () => {
    // at exactly 1.8m the normalization term is zero
    expect(normalizedFfmi(68, 180)).toBeCloseTo(ffmi(68, 180), 5)
  })
})

describe('training', () => {
  it('sums volume load (tonnage)', () => {
    expect(totalVolume([{ reps: 10, weightKg: 100 }, { reps: 8, weightKg: 100 }])).toBe(1800)
  })

  it('counts weekly sets per muscle', () => {
    const counts = weeklySetsPerMuscle([
      { reps: 10, weightKg: 50, muscle: 'chest' },
      { reps: 10, weightKg: 50, muscle: 'chest' },
      { reps: 8, weightKg: 80, muscle: 'back' },
    ])
    expect(counts).toEqual({ chest: 2, back: 1 })
  })

  it('estimates 1RM (Epley and Brzycki agree closely at moderate reps)', () => {
    expect(oneRepMaxEpley(100, 5)).toBeCloseTo(116.67, 1)
    expect(oneRepMaxBrzycki(100, 5)).toBeCloseTo(112.5, 1)
  })
})

describe('balance', () => {
  const days = [
    { intake: 2000, expenditure: 2500 },
    { intake: 2200, expenditure: 2500 },
    { intake: 3000, expenditure: 2500 },
  ]

  it('accumulates net energy balance', () => {
    expect(cumulativeBalance(days)).toEqual([-500, -800, -300])
  })

  it('reports total deficit when net negative', () => {
    expect(totalDeficit(days)).toBe(300)
    expect(totalSurplus(days)).toBe(0)
  })

  it('tracks cumulative protein balance', () => {
    expect(
      cumulativeProteinBalance([
        { intake: 150, target: 160 },
        { intake: 170, target: 160 },
      ]),
    ).toEqual([-10, 0])
  })

  it('projects mass change from net energy (7700 kcal/kg)', () => {
    expect(projectedMassChangeKg(-7700)).toBeCloseTo(-1, 5)
  })
})
