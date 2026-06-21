import { describe, expect, it } from 'vitest'
import { ageYearsFrom, estimateExpenditure } from './profile'

describe('ageYearsFrom', () => {
  it('counts whole years up to the reference date', () => {
    expect(ageYearsFrom('1996-06-21', '2026-06-21')).toBe(30)
  })
  it('does not count the year before the birthday lands', () => {
    expect(ageYearsFrom('1996-06-22', '2026-06-21')).toBe(29)
  })
  it('falls back to 30 when birthdate is unknown', () => {
    expect(ageYearsFrom(null, '2026-06-21')).toBe(30)
  })
})

describe('estimateExpenditure', () => {
  it('matches BMR×activity for a known profile (male 80kg/180cm/30y, moderate)', () => {
    const tdee = estimateExpenditure({
      sex: 'male',
      heightCm: 180,
      birthdate: '1996-06-21',
      activity: 'moderate',
      bmrFormula: 'mifflin',
      weightKg: 80,
      asOf: '2026-06-21',
    })
    expect(tdee).toBeCloseTo(2759, 0) // mifflin 1780 × 1.55
  })
})
