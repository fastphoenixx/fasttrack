// Weight-trend smoothing: an exponentially-weighted moving average (EWMA)
// separates the real trend from daily scale noise (water, gut content, sodium).
// Same idea as the Hacker's Diet / MacroFactor trend weight. Pure.

export interface WeightPoint {
  date: string
  weight: number | null
}

export interface TrendPoint {
  date: string
  weight: number | null
  /** EWMA trend, carried forward across days with no weigh-in. */
  trend: number | null
}

export interface WeightTrend {
  series: TrendPoint[]
  /** Std deviation of (weight − trend) over weigh-in days: the noise band width. */
  residualStd: number
  /** Latest weigh-in minus its trend (+ above trend, − below). null if no data. */
  lastDeviation: number | null
}

/**
 * EWMA over weigh-ins, carrying the trend across missing days.
 * alpha in (0,1]: higher = more responsive, lower = smoother. 0.25 ≈ a ~1-week
 * half-life for daily data.
 */
export function weightTrend(points: WeightPoint[], alpha = 0.25): WeightTrend {
  let trend: number | null = null
  const residuals: number[] = []
  let lastDeviation: number | null = null

  const series = points.map(({ date, weight }) => {
    if (weight != null) {
      trend = trend == null ? weight : alpha * weight + (1 - alpha) * trend
      const dev = weight - trend
      residuals.push(dev)
      lastDeviation = dev
    }
    return { date, weight, trend }
  })

  const residualStd =
    residuals.length > 1
      ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)
      : 0

  return { series, residualStd, lastDeviation }
}
