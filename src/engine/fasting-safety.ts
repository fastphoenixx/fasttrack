import type { RiskBand } from './screening'

// Water-fast safety engine. Every advice path passes through fastTypePolicy so
// dry/religious fasts NEVER receive "drink water + add sodium" guidance (the
// locked inversion). All thresholds are sourced estimates, shown openly — this
// is guidance, not medical advice; it routes to clinical care.

export type FastKind = 'none' | 'intermittent' | 'omad' | 'extended_water' | 'dry' | 'religious'

export interface FastTypePolicy {
  /** May we advise drinking water / electrolytes during the fast window? */
  hydrationAdvice: boolean
  electrolyteAdvice: boolean
  /** Does energy-deficit / fat-loss math apply (off for religious-food)? */
  energyTracking: boolean
  /** Does a guided refeed apply on fast end? */
  refeedApplies: boolean
  /** Sourced safety ceiling on continuous fast hours (dry fasts). */
  dryCeilingHours?: number
}

/** THE branch primitive every advice surface reads. Unit-tested per type. */
export function fastTypePolicy(kind: FastKind): FastTypePolicy {
  switch (kind) {
    case 'extended_water':
      return { hydrationAdvice: true, electrolyteAdvice: true, energyTracking: true, refeedApplies: true }
    case 'dry':
      // No water/electrolytes during a dry fast — the only safe correction is to break it.
      return { hydrationAdvice: false, electrolyteAdvice: false, energyTracking: true, refeedApplies: true, dryCeilingHours: 24 }
    case 'religious':
      // Conservative: could be dry (Yom Kippur) or food (Daniel) — never push hydration/electrolytes.
      return { hydrationAdvice: false, electrolyteAdvice: false, energyTracking: false, refeedApplies: false, dryCeilingHours: 25 }
    case 'omad':
    case 'intermittent':
      return { hydrationAdvice: true, electrolyteAdvice: false, energyTracking: true, refeedApplies: false }
    case 'none':
      return { hydrationAdvice: true, electrolyteAdvice: false, energyTracking: true, refeedApplies: false }
  }
}

// --- electrolytes (water-fast branch only) --------------------------------
// Targets are estimates for extended water fasts; CAPS are hard safety limits.
// Potassium is the dangerous one: never bolus, cap supplemental ~2g/day.
export interface MineralTarget {
  targetMg: number
  ceilingMg: number
}
export interface ElectrolytePlan {
  sodium: MineralTarget
  potassium: MineralTarget
  magnesium: MineralTarget
}

/** Daily Na/K/Mg targets+ceilings, or null when the fast type forbids electrolyte advice. */
export function electrolyteTargets(kind: FastKind, fastingHours: number): ElectrolytePlan | null {
  if (!fastTypePolicy(kind).electrolyteAdvice) return null
  // Ramp targets a little as the fast extends (more excretion), within fixed caps.
  const ramp = fastingHours >= 24 ? 1 : 0.6
  return {
    sodium: { targetMg: Math.round(3000 + 2000 * ramp), ceilingMg: 10000 }, // ~3–5 g; salt ceiling
    potassium: { targetMg: Math.round(1000 + 500 * ramp), ceilingMg: 2000 }, // supplemental cap — cardiac
    magnesium: { targetMg: Math.round(300 + 50 * ramp), ceilingMg: 600 }, // GI ceiling
  }
}

/**
 * Hyponatremia / over-hydration guard (water-fast only): lots of plain water with
 * little sodium is the classic multi-day-fast danger. Returns a warning or null.
 */
export function hyponatremiaRisk(kind: FastKind, waterMl: number | null, sodiumMg: number | null): string | null {
  if (!fastTypePolicy(kind).hydrationAdvice) return null
  if (waterMl == null) return null
  if (waterMl >= 3000 && (sodiumMg ?? 0) < 1500) {
    return 'High water intake with low sodium — hyponatremia risk. Reduce plain water and add sodium (do not just drink more).'
  }
  return null
}

// --- stage timeline -------------------------------------------------------
export interface FastStage {
  key: string
  label: string
  fromHours: number
  mechanism: string
  /** Emerging/over-claimed science (autophagy etc.) — rendered as estimate, never a benefit "achieved". */
  speculative?: boolean
}

export const FAST_STAGES: FastStage[] = [
  { key: 'fed', label: 'Fed / anabolic', fromHours: 0, mechanism: 'Digesting; insulin elevated, storing.' },
  { key: 'catabolic', label: 'Catabolic', fromHours: 4, mechanism: 'Insulin falling; burning recent food then glycogen.' },
  { key: 'glycogen', label: 'Glycogen depletion', fromHours: 12, mechanism: 'Liver glycogen draining; water released — most early scale drop.' },
  { key: 'ketosis', label: 'Ketosis rising', fromHours: 16, mechanism: 'Fat → ketones increasing.', speculative: false },
  { key: 'autophagy', label: 'Autophagy (estimated)', fromHours: 24, mechanism: 'Cellular recycling upregulates — timing in humans is uncertain.', speculative: true },
  { key: 'deep', label: 'Deep ketosis / adaptation', fromHours: 48, mechanism: 'Gluconeogenesis adapts; protein-sparing.' },
  { key: 'extended', label: 'Extended (days 3–7)', fromHours: 72, mechanism: 'Electrolyte & refeeding risk rising — supervision advised.' },
  { key: 'prolonged', label: 'Prolonged (7 days+)', fromHours: 168, mechanism: 'Sodium-depletion window; bloodwork strongly advised.' },
]

/** The stage a given fasting-hour count falls into. */
export function currentStage(fastingHours: number): FastStage {
  return [...FAST_STAGES].reverse().find((s) => fastingHours >= s.fromHours) ?? FAST_STAGES[0]
}

// --- refeed (the genuinely dangerous part) --------------------------------
export interface RefeedPlan {
  refeedDays: number
  kcalDay1: number
  kcalPerKg: number
  thiamineBeforeCarbs: boolean
  phosphateUntracked: true
  bloodworkAdvised: boolean
  ladder: string[]
}

/**
 * Guided refeed after an extended water fast. refeed_days = ceil(fastDays/2)
 * (TrueNorth). kcal ramp from logged weight (NICE: 10 kcal/kg, 5 if extreme/HIGH
 * risk). Thiamine 100mg before carbs is universal (NICE/ASPEN). Phosphate is the
 * untracked canary → bloodwork for long/high-risk fasts. Never doses phosphate/K.
 */
export function refeedPlan(fastDays: number, weightKg: number, band: RiskBand): RefeedPlan {
  const kcalPerKg = band === 'high' ? 5 : 10
  return {
    refeedDays: Math.max(1, Math.ceil(fastDays / 2)),
    kcalPerKg,
    kcalDay1: Math.round(kcalPerKg * weightKg),
    thiamineBeforeCarbs: true,
    phosphateUntracked: true,
    bloodworkAdvised: fastDays > 7 || band === 'high',
    ladder: [
      'Day 1: fluids — bone broth, diluted juice, a little avocado. Spoonfuls, not bowlfuls.',
      'Day 2: soft proteins/fats — eggs, fish, more avocado, cooked veg.',
      'Day 3+: gradually reintroduce normal portions and complex carbs.',
    ],
  }
}

// --- biomarkers -----------------------------------------------------------
export type KetosisZone = 'none' | 'light' | 'nutritional' | 'deep'

/** Blood-ketone (BHB) zone. Honest labels — measured, not the "autophagy" myth. */
export function ketosisZone(bhbMmol: number): KetosisZone {
  if (bhbMmol < 0.5) return 'none'
  if (bhbMmol < 1.0) return 'light'
  if (bhbMmol < 3.0) return 'nutritional'
  return 'deep'
}

/**
 * Glucose-Ketone Index = (glucose mmol/L) ÷ BHB mmol/L. Lower = deeper
 * therapeutic ketosis (Seyfried). Null below nutritional ketosis (BHB < 0.4),
 * where the ratio isn't meaningful. glucose in mg/dL (÷18 → mmol/L).
 */
export function gki(glucoseMgdl: number, bhbMmol: number): number | null {
  if (bhbMmol < 0.4) return null
  return Math.round(((glucoseMgdl / 18) / bhbMmol) * 10) / 10
}

// --- symptom triage -------------------------------------------------------
export type SymptomTier = 'ok' | 'deficiency' | 'hardstop'
export interface SymptomVerdict {
  tier: SymptomTier
  action: string
}

const HARD_STOP = new Set(['palpitations', 'fainting', 'confusion', 'seizure', 'severe_weakness', 'chest_pain'])
const DEFICIENCY = new Set(['headache', 'fatigue', 'cramps', 'dizziness', 'nausea', 'insomnia'])

/** Map a logged symptom to a tiered action, branching on fast type. */
export function symptomTriage(symptom: string, kind: FastKind): SymptomVerdict {
  if (HARD_STOP.has(symptom)) {
    return { tier: 'hardstop', action: 'Stop the fast now and seek medical care. If severe, call emergency services.' }
  }
  if (DEFICIENCY.has(symptom)) {
    return fastTypePolicy(kind).hydrationAdvice
      ? { tier: 'deficiency', action: 'Likely electrolytes — top up sodium and magnesium, sip water.' }
      : { tier: 'deficiency', action: 'On a dry/religious fast this signals the fast may need to end — the only safe correction is to break it.' }
  }
  return { tier: 'ok', action: 'No action — keep monitoring.' }
}
