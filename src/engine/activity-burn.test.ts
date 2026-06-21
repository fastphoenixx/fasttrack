import { describe, it, expect } from 'vitest'
import {
  kcalFromMet,
  metForExercise,
  setBurnKcal,
  burnKcal,
  STRENGTH_MET,
  DEFAULT_STRENGTH_SET_SECONDS,
} from './activity-burn'

describe('kcalFromMet', () => {
  it('applies the standard MET equation', () => {
    // 5 MET, 80 kg, 60 min → 5 × 3.5 × 80 / 200 × 60 = 420 kcal
    expect(kcalFromMet(5, 80, 60)).toBeCloseTo(420, 5)
  })
  it('returns 0 for non-positive inputs', () => {
    expect(kcalFromMet(0, 80, 60)).toBe(0)
    expect(kcalFromMet(5, 0, 60)).toBe(0)
    expect(kcalFromMet(5, 80, 0)).toBe(0)
  })
})

describe('metForExercise — cardio pace sensitivity', () => {
  it("the user's case: 10 km walk over 4 h is a slow-walk MET", () => {
    const met = metForExercise({ exerciseTitle: 'Walking', distanceKm: 10, durationSeconds: 4 * 3600 })
    expect(met).toBe(2.8) // 2.5 km/h → slowest walk bucket
  })
  it('a brisk run gets a high MET from pace, not the title', () => {
    // 12 km in 1 h = 12 km/h
    const met = metForExercise({ exerciseTitle: 'Running', distanceKm: 12, durationSeconds: 3600 })
    expect(met).toBe(11.0)
  })
  it('falls back to a moderate walk when pace is unknown', () => {
    expect(metForExercise({ exerciseTitle: 'Walk', distanceKm: null, durationSeconds: null })).toBe(3.5)
  })
  it('classifies resistance work as the strength MET', () => {
    expect(metForExercise({ exerciseTitle: 'Bench Press', distanceKm: null, durationSeconds: null })).toBe(STRENGTH_MET)
  })
})

describe('setBurnKcal', () => {
  it("scores the user's 10 km / 4 h walk at ~940 kcal for an 80 kg person", () => {
    const kcal = setBurnKcal(
      { exerciseTitle: 'Walking', distanceKm: 10, durationSeconds: 4 * 3600 },
      80,
    )
    // 2.8 × 3.5 × 80 / 200 × 240 = 940.8
    expect(kcal).toBeCloseTo(940.8, 1)
  })
  it('uses a default working time for untimed strength sets', () => {
    const kcal = setBurnKcal({ exerciseTitle: 'Squat', distanceKm: null, durationSeconds: null }, 80)
    const expected = (STRENGTH_MET * 3.5 * 80) / 200 * (DEFAULT_STRENGTH_SET_SECONDS / 60)
    expect(kcal).toBeCloseTo(expected, 5)
  })
  it('contributes 0 for untimed cardio (cannot bound the time)', () => {
    expect(setBurnKcal({ exerciseTitle: 'Running', distanceKm: null, durationSeconds: null }, 80)).toBe(0)
  })
  it('returns 0 when bodyweight is unknown', () => {
    expect(setBurnKcal({ exerciseTitle: 'Walking', distanceKm: 5, durationSeconds: 3600 }, 0)).toBe(0)
  })
})

describe('burnKcal — whole day', () => {
  it('sums a mixed day of cardio + lifting', () => {
    const sets = [
      { exerciseTitle: 'Walking', distanceKm: 5, durationSeconds: 3600 }, // 5 km/h → 4.3 MET, 60 min
      { exerciseTitle: 'Bench Press', distanceKm: null, durationSeconds: null },
      { exerciseTitle: 'Bench Press', distanceKm: null, durationSeconds: null },
    ]
    const walk = (4.3 * 3.5 * 80) / 200 * 60
    const lift = 2 * ((STRENGTH_MET * 3.5 * 80) / 200 * (DEFAULT_STRENGTH_SET_SECONDS / 60))
    expect(burnKcal(sets, 80)).toBeCloseTo(walk + lift, 4)
  })
  it('is 0 for an empty day', () => {
    expect(burnKcal([], 80)).toBe(0)
  })
})
