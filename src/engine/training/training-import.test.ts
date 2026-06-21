import { describe, expect, it } from 'vitest'
import { classifyExercise } from './muscles'
import { setVolumeLoad, weeklyExerciseSeries, weeklyVolumeByMuscle, weekStart } from './volume'
import type { VolumePoint } from './volume'
import { groupHevyRows, parseHevyDateTime, type HevyRow } from '../import/hevy'

describe('classifyExercise', () => {
  it('maps known Hevy exercises explicitly', () => {
    expect(classifyExercise('Bench Press (Barbell)')).toBe('chest')
    expect(classifyExercise('Pull Up')).toBe('back')
    expect(classifyExercise('Lateral Raise (Dumbbell)')).toBe('shoulders')
    expect(classifyExercise('Lying Neck Curls (Weighted)')).toBe('neck')
    expect(classifyExercise('Cycling')).toBe('cardio')
  })

  it('falls back to keywords for unknown names', () => {
    expect(classifyExercise('Hammer Curl (Cable)')).toBe('biceps')
    expect(classifyExercise('Some Goblet Squat Variation')).toBe('quads')
    expect(classifyExercise('Mystery Move')).toBe('other')
  })
})

describe('parseHevyDateTime', () => {
  it('parses the Hevy format to ISO', () => {
    expect(parseHevyDateTime('20 Jun 2026, 12:19')).toBe('2026-06-20T12:19:00')
    expect(parseHevyDateTime('2 Mar 2026, 11:38')).toBe('2026-03-02T11:38:00')
  })
  it('returns null on garbage', () => {
    expect(parseHevyDateTime('not a date')).toBeNull()
  })
})

const rows: HevyRow[] = [
  mk('Pull 1', 'Bent Over Row (Barbell)', 0, 'warmup', '60', '4'),
  mk('Pull 1', 'Bent Over Row (Barbell)', 1, 'normal', '60', '12'),
  mk('Pull 1', 'Lat Pulldown (Cable)', 0, 'normal', '70', '12'),
  mk('Pull 1', 'Cycling', 0, 'normal', '', '', '9.2', '2040'),
]

function mk(
  title: string,
  exercise: string,
  idx: number,
  type: string,
  weight: string,
  reps: string,
  distance = '',
  duration = '',
): HevyRow {
  return {
    title,
    start_time: '20 Jun 2026, 12:19',
    end_time: '20 Jun 2026, 14:19',
    description: '',
    exercise_title: exercise,
    superset_id: '',
    exercise_notes: '',
    set_index: String(idx),
    set_type: type,
    weight_kg: weight,
    reps,
    distance_km: distance,
    duration_seconds: duration,
    rpe: '',
  }
}

describe('groupHevyRows', () => {
  it('groups flat rows into one workout with all sets', () => {
    const workouts = groupHevyRows(rows)
    expect(workouts).toHaveLength(1)
    expect(workouts[0].title).toBe('Pull 1')
    expect(workouts[0].logDate).toBe('2026-06-20')
    expect(workouts[0].externalHash).toBe('Pull 1|2026-06-20T12:19:00')
    expect(workouts[0].sets).toHaveLength(4)
  })
})

describe('volume aggregation', () => {
  it('counts warmups and cardio as zero volume', () => {
    const warm: VolumePoint = { date: '2026-06-20', exerciseTitle: 'x', muscle: 'back', weightKg: 60, reps: 4, setType: 'warmup' }
    const work: VolumePoint = { date: '2026-06-20', exerciseTitle: 'x', muscle: 'back', weightKg: 60, reps: 12, setType: 'normal' }
    expect(setVolumeLoad(warm)).toBe(0)
    expect(setVolumeLoad(work)).toBe(720)
  })

  it('computes Monday week start (UTC)', () => {
    expect(weekStart('2026-06-20')).toBe('2026-06-15') // Sat -> Mon the 15th
    expect(weekStart('2026-06-15')).toBe('2026-06-15')
  })

  it('aggregates weekly volume per muscle', () => {
    const pts: VolumePoint[] = [
      { date: '2026-06-20', exerciseTitle: 'Row', muscle: 'back', weightKg: 60, reps: 12, setType: 'normal' },
      { date: '2026-06-20', exerciseTitle: 'Bench', muscle: 'chest', weightKg: 80, reps: 10, setType: 'normal' },
      { date: '2026-06-20', exerciseTitle: 'Row', muscle: 'back', weightKg: 60, reps: 4, setType: 'warmup' },
    ]
    const { muscles, weeks } = weeklyVolumeByMuscle(pts)
    expect(muscles).toEqual(['back', 'chest'])
    expect(weeks).toHaveLength(1)
    expect(weeks[0].back).toBe(720) // warmup excluded
    expect(weeks[0].chest).toBe(800)
  })

  it('builds a per-exercise series with best est 1RM', () => {
    const pts: VolumePoint[] = [
      { date: '2026-06-20', exerciseTitle: 'Squat', muscle: 'quads', weightKg: 100, reps: 5, setType: 'normal' },
      { date: '2026-06-20', exerciseTitle: 'Squat', muscle: 'quads', weightKg: 110, reps: 3, setType: 'normal' },
    ]
    const series = weeklyExerciseSeries(pts, 'Squat')
    expect(series).toHaveLength(1)
    expect(series[0].sets).toBe(2)
    expect(series[0].volume).toBe(100 * 5 + 110 * 3)
    expect(series[0].est1rm).toBeCloseTo(121, 0) // 110*(1+3/30)=121
  })
})
