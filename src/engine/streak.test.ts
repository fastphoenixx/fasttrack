import { describe, expect, it } from 'vitest'
import { weekStreak } from './streak'

describe('weekStreak', () => {
  it('counts consecutive weeks and stays alive if logged this week', () => {
    // weeks of Jun 1 (Mon), Jun 8, Jun 15 — three consecutive; asOf in the Jun 15 week
    const r = weekStreak(['2026-06-03', '2026-06-10', '2026-06-17'], '2026-06-18')
    expect(r.current).toBe(3)
    expect(r.best).toBe(3)
  })

  it('stays alive when last week (not this week) was logged', () => {
    const r = weekStreak(['2026-06-10'], '2026-06-18') // logged previous week
    expect(r.current).toBe(1)
  })

  it('breaks current but keeps best after a gap', () => {
    const r = weekStreak(['2026-05-04', '2026-05-11', '2026-06-17'], '2026-06-18')
    expect(r.best).toBe(2) // the two May weeks
    expect(r.current).toBe(1) // only the recent week
  })

  it('is zero with no dates', () => {
    expect(weekStreak([], '2026-06-18')).toEqual({ current: 0, best: 0 })
  })
})
