import { KCAL_PER_KG_FAT } from './types'

// Honest decomposition of weight lost during a fast. The naive "7700 kcal/kg"
// model attributes the whole scale drop to fat, which badly misleads multi-day
// fasters: most early loss is glycogen + its bound water, which returns on refeed.
//
// Model (transparent, an ESTIMATE — not a measurement):
//  - Glycogen stores (~400–500 g) bind ~3 g water per gram → up to ~2 kg of
//    glycogen+water, depleting over the first ~24–48 h. Modeled as an
//    exponential approach to GLYCOGEN_WATER_MAX with time constant GLYCOGEN_TAU.
//  - True fat loss comes from the energy deficit: deficit / 7700 kcal·kg⁻¹.
//  - Whatever the scale shows beyond those two is "other" (lean/gut/unexplained).
// Sources: 3 g water/g glycogen and ~500 g glycogen are standard physiology;
// the depletion curve is a simplification.

export const GLYCOGEN_WATER_MAX_KG = 2.0
export const GLYCOGEN_TAU_HOURS = 18

export interface FastDecomposition {
  observedLossKg: number
  /** Glycogen + bound water — returns on refeed, not fat. */
  glycogenWaterKg: number
  /** True fat loss implied by the energy deficit. */
  fatLossKg: number
  /** Residual (lean mass, gut content, model error). */
  otherKg: number
}

/**
 * Split an observed fast weight loss into glycogen/water, true fat, and other.
 * Components never sum beyond the observed loss (each is clamped in turn).
 */
export function decomposeFastLoss(
  observedLossKg: number,
  fastHours: number,
  deficitKcal: number,
): FastDecomposition {
  const loss = Math.max(0, observedLossKg)

  const rawGlycogenWater = GLYCOGEN_WATER_MAX_KG * (1 - Math.exp(-fastHours / GLYCOGEN_TAU_HOURS))
  const glycogenWaterKg = Math.min(rawGlycogenWater, loss)

  const rawFat = Math.max(0, deficitKcal) / KCAL_PER_KG_FAT
  const fatLossKg = Math.min(rawFat, loss - glycogenWaterKg)

  const otherKg = loss - glycogenWaterKg - fatLossKg

  return { observedLossKg: loss, glycogenWaterKg, fatLossKg, otherKg }
}

/**
 * The number an anxious daily weigher actually needs: estimated TRUE fat lost
 * (kg) from the energy deficit, independent of the noisy scale. A −1.5 kg
 * morning is mostly water; this answers "how much was really fat?".
 * deficitKcal is positive for a deficit (expenditure − intake); surplus → 0.
 */
export function fatLossFromDeficit(deficitKcal: number): number {
  return Math.max(0, deficitKcal) / KCAL_PER_KG_FAT
}

/** Per-day true fat loss (kg) from that day's intake vs expenditure. */
export function dailyFatLossKg(intake: number, expenditure: number): number {
  return fatLossFromDeficit(expenditure - intake)
}
