// Medical-screening gate for fasting advice. Scored 3-band risk calculator,
// architecture ported from the validated IDF-DAR 2021 Ramadan risk tool +
// Yom Kippur physician contraindication lists. This is locked-constraint (a):
// the precondition that unlocks ANY advice surface. Pure & transparent — every
// item shows its points. NOT medical advice; it gates and routes to care.

export interface ScreeningItem {
  key: string
  label: string
  points: number
  /** Selecting this forces the HIGH band regardless of total (absolute exclusion). */
  autoHigh?: boolean
  source: string
}

export const SCREENING_ITEMS: ScreeningItem[] = [
  { key: 'anorexia_history', label: 'History of anorexia / restrictive eating disorder', points: 0, autoHigh: true, source: 'ED contraindication to prolonged fasting' },
  { key: 't1d_unmonitored', label: 'Type 1 diabetes (or any unmonitored diabetes)', points: 0, autoHigh: true, source: 'IDF-DAR very-high-risk' },
  { key: 'metabolic_disorder', label: 'Glycogen-storage / urea-cycle disorder or insulinoma', points: 0, autoHigh: true, source: 'gluconeogenesis/hypoglycemia risk' },
  { key: 'pregnant_breastfeeding', label: 'Pregnant or breastfeeding', points: 0, autoHigh: true, source: 'IDF-DAR / obstetric guidance' },
  { key: 'under_18', label: 'Under 18 years old', points: 0, autoHigh: true, source: 'pediatric exclusion' },
  { key: 'bmi_under_16', label: 'BMI under 16', points: 0, autoHigh: true, source: 'refeeding-syndrome high-risk (NICE)' },
  { key: 'insulin_sulfonylurea', label: 'On insulin or sulfonylurea', points: 4, source: 'IDF-DAR hypoglycemia risk' },
  { key: 'diuretics_lithium_sglt2', label: 'On diuretics, lithium, or SGLT2 inhibitors', points: 3, source: 'electrolyte/euglycemic-DKA/lithium-toxicity risk' },
  { key: 'prior_severe_hypo', label: 'Prior severe hypoglycemia', points: 3, source: 'IDF-DAR' },
  { key: 'ckd', label: 'Chronic kidney disease / reduced eGFR', points: 3, source: 'electrolyte handling' },
  { key: 'ed_history_other', label: 'Other disordered-eating history', points: 3, source: 'ED caution' },
  { key: 'baseline_low_electrolytes', label: 'Known low baseline electrolytes', points: 2, source: 'refeeding/arrhythmia risk' },
  { key: 'cardiac_history', label: 'Heart condition / arrhythmia history', points: 2, source: 'electrolyte-shift arrhythmia risk' },
  { key: 'on_other_chronic_meds', label: 'Other daily prescription medication', points: 1, source: 'med-timing review needed' },
]

export type RiskBand = 'low' | 'moderate' | 'high'

export interface ScreeningResult {
  score: number
  band: RiskBand
  /** True when an absolute-exclusion item forced HIGH. */
  autoHigh: boolean
  /** Whether advice features may be shown at all (false only for HIGH). */
  adviceUnlocked: boolean
  flagged: string[]
}

/**
 * Score selected risk-item keys into a band.
 * LOW 0–3 (advice unlocked), MODERATE 3.5–6 (advice + persistent caution),
 * HIGH >6 or any auto-exclusion (advice HARD-BLOCKED → route to clinician).
 */
export function scoreScreening(selectedKeys: string[]): ScreeningResult {
  const selected = SCREENING_ITEMS.filter((i) => selectedKeys.includes(i.key))
  const score = selected.reduce((s, i) => s + i.points, 0)
  const autoHigh = selected.some((i) => i.autoHigh)
  const band: RiskBand = autoHigh || score > 6 ? 'high' : score > 3 ? 'moderate' : 'low'
  return {
    score,
    band,
    autoHigh,
    adviceUnlocked: band !== 'high',
    flagged: selected.map((i) => i.key),
  }
}
