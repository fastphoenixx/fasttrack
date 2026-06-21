import { describe, expect, it } from 'vitest'
import { weightTrend } from './trend'
import { dailyFatLossKg, decomposeFastLoss, fatLossFromDeficit } from './water-fast'

describe('weightTrend (EWMA)', () => {
  it('smooths noise and carries the trend across missing days', () => {
    const { series, lastDeviation } = weightTrend(
      [
        { date: 'd1', weight: 80 },
        { date: 'd2', weight: null }, // missed weigh-in
        { date: 'd3', weight: 78 }, // big "drop" (water noise)
      ],
      0.25,
    )
    expect(series[0].trend).toBe(80)
    expect(series[1].trend).toBe(80) // carried across the gap
    expect(series[2].trend).toBeCloseTo(79.5, 5) // 0.25*78 + 0.75*80, not the full 78
    expect(lastDeviation).toBeCloseTo(78 - 79.5, 5) // below trend
  })

  it('reports zero residual std with fewer than two weigh-ins', () => {
    expect(weightTrend([{ date: 'd1', weight: 80 }]).residualStd).toBe(0)
  })
})

describe('fat loss (anxious daily weigher)', () => {
  it('true fat loss is deficit/7700, not the scale swing', () => {
    expect(fatLossFromDeficit(7700)).toBeCloseTo(1, 5)
    expect(dailyFatLossKg(1500, 2500)).toBeCloseTo(1000 / 7700, 5) // ~0.13 kg from a 1000 kcal deficit
  })

  it('a surplus day yields zero fat loss (not negative)', () => {
    expect(dailyFatLossKg(3000, 2500)).toBe(0)
  })
})

describe('decomposeFastLoss', () => {
  it('attributes most of an early fast drop to glycogen/water, not fat', () => {
    const d = decomposeFastLoss(3.0, 48, 5000)
    expect(d.glycogenWaterKg).toBeCloseTo(1.86, 1) // ~2*(1-e^-48/18)
    expect(d.fatLossKg).toBeCloseTo(0.649, 2) // 5000/7700
    expect(d.glycogenWaterKg + d.fatLossKg + d.otherKg).toBeCloseTo(3.0, 5)
  })

  it('never attributes more than the observed loss', () => {
    const d = decomposeFastLoss(0.5, 72, 9000)
    expect(d.glycogenWaterKg + d.fatLossKg + d.otherKg).toBeCloseTo(0.5, 5)
    expect(d.otherKg).toBeGreaterThanOrEqual(0)
  })
})
