import type { Sex } from './types'

export interface NavyInput {
  sex: Sex
  heightCm: number
  neckCm: number
  waistCm: number
  /** Hip circumference — required for females in the US Navy method. */
  hipCm?: number
}

/**
 * US Navy circumference body-fat estimate. Returns a percentage (0..100).
 * Uses log base 10 of measurements in centimetres.
 */
export function bodyFatNavy({ sex, heightCm, neckCm, waistCm, hipCm }: NavyInput): number {
  if (sex === 'male') {
    const denom =
      1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)
    return 495 / denom - 450
  }
  if (hipCm == null) {
    throw new Error('bodyFatNavy requires hipCm for female subjects')
  }
  const denom =
    1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)
  return 495 / denom - 450
}
