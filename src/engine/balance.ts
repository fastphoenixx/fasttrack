import { KCAL_PER_KG_FAT } from './types'

export interface EnergyDay {
  /** Calories consumed that day. */
  intake: number
  /** Estimated TDEE (expenditure) that day. */
  expenditure: number
}

/**
 * Net energy balance per day: positive = surplus, negative = deficit.
 * Returned in the same order as the input.
 */
export function dailyBalance(days: EnergyDay[]): number[] {
  return days.map((d) => d.intake - d.expenditure)
}

/** Cumulative running energy balance over the series. */
export function cumulativeBalance(days: EnergyDay[]): number[] {
  let running = 0
  return days.map((d) => {
    running += d.intake - d.expenditure
    return running
  })
}

/** Total deficit (kcal, as a positive number) across the series. 0 if net surplus. */
export function totalDeficit(days: EnergyDay[]): number {
  const net = days.reduce((sum, d) => sum + (d.intake - d.expenditure), 0)
  return net < 0 ? -net : 0
}

/** Total surplus (kcal) across the series. 0 if net deficit. */
export function totalSurplus(days: EnergyDay[]): number {
  const net = days.reduce((sum, d) => sum + (d.intake - d.expenditure), 0)
  return net > 0 ? net : 0
}

/**
 * Cumulative protein balance (g): consumed minus target, day by day.
 * Positive means hitting/exceeding the target over time.
 */
export function cumulativeProteinBalance(
  days: { intake: number; target: number }[],
): number[] {
  let running = 0
  return days.map((d) => {
    running += d.intake - d.target
    return running
  })
}

/**
 * Projected body-mass change (kg) from net energy balance, using the
 * ~7700 kcal/kg fat model. A rough model: ignores water, glycogen, and
 * metabolic adaptation. Negative = mass lost.
 */
export function projectedMassChangeKg(netEnergyKcal: number): number {
  return netEnergyKcal / KCAL_PER_KG_FAT
}
