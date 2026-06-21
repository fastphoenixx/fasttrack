/** Lean body mass (kg) given weight and body-fat fraction (0..1). */
export function leanBodyMass(weightKg: number, bodyFatFraction: number): number {
  return weightKg * (1 - bodyFatFraction)
}

/** Fat mass (kg). */
export function fatMass(weightKg: number, bodyFatFraction: number): number {
  return weightKg * bodyFatFraction
}

/** Fat-Free Mass Index: lean mass (kg) / height (m)². */
export function ffmi(leanMassKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return leanMassKg / (heightM * heightM)
}

/**
 * Height-normalized FFMI (adjusts toward a 1.8 m reference) — the figure used in
 * the "natural ceiling ~25" discussions.
 */
export function normalizedFfmi(leanMassKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return ffmi(leanMassKg, heightCm) + 6.1 * (1.8 - heightM)
}
