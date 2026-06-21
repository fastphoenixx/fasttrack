import { ACTIVITY_FACTORS, type ActivityLevel, type Goal } from './types'

/** Total Daily Energy Expenditure = BMR × activity factor. */
export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return bmrValue * ACTIVITY_FACTORS[activity]
}

/** Default calorie adjustment per goal, as a fraction of TDEE. */
export const GOAL_ADJUSTMENT: Record<Goal, number> = {
  cut: -0.2,
  maintain: 0,
  bulk: 0.1,
}

/**
 * Target intake for a goal. Pass an explicit adjustmentFraction to override the
 * goal default (e.g. an aggressive -0.25 cut).
 */
export function targetCalories(
  tdeeValue: number,
  goal: Goal,
  adjustmentFraction = GOAL_ADJUSTMENT[goal],
): number {
  return tdeeValue * (1 + adjustmentFraction)
}
