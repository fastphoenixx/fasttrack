import { describe, expect, it } from 'vitest'
import { bmr, bmrHarrisBenedict, bmrKatchMcArdle, bmrMifflin } from './bmr'

describe('bmrMifflin', () => {
  it('matches reference for a male subject (80kg, 180cm, 30y)', () => {
    expect(bmrMifflin({ sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30 })).toBeCloseTo(1780, 0)
  })

  it('matches reference for a female subject (60kg, 165cm, 30y)', () => {
    expect(bmrMifflin({ sex: 'female', weightKg: 60, heightCm: 165, ageYears: 30 })).toBeCloseTo(1320.25, 2)
  })
})

describe('bmrHarrisBenedict', () => {
  it('matches reference for a male subject', () => {
    expect(bmrHarrisBenedict({ sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30 })).toBeCloseTo(1853.63, 1)
  })
})

describe('bmrKatchMcArdle', () => {
  it('uses lean body mass (80kg @ 15% bf -> LBM 68kg)', () => {
    expect(bmrKatchMcArdle({ sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30, bodyFatFraction: 0.15 })).toBeCloseTo(1838.8, 1)
  })

  it('throws when bodyFatFraction is missing', () => {
    expect(() => bmrKatchMcArdle({ sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30 })).toThrow()
  })
})

describe('bmr dispatcher', () => {
  it('routes to the named formula', () => {
    const input = { sex: 'male' as const, weightKg: 80, heightCm: 180, ageYears: 30 }
    expect(bmr('mifflin', input)).toBeCloseTo(1780, 0)
  })
})
