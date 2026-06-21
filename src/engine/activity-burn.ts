// Estimate energy burned from logged exercise, so daily expenditure becomes
// dynamic instead of a flat BMR × activity factor. Pure: no I/O, no dates.
//
// Model: the standard MET equation
//   kcal = MET × 3.5 × bodyweightKg / 200 × minutes
// Cardio (walking/running/etc.) is refined by pace when both distance and
// duration are known; resistance work uses a fixed working-MET applied to a
// default per-set working time when the set carries no duration of its own.

/** The subset of a logged set needed to estimate energy burn. */
export interface BurnSet {
  exerciseTitle: string
  durationSeconds: number | null
  distanceKm: number | null
}

type Category =
  | 'foot' // walk / run / treadmill — pace decides the MET
  | 'hike'
  | 'cycling'
  | 'rowing'
  | 'swimming'
  | 'elliptical'
  | 'stairs'
  | 'mobility'
  | 'strength'

/** Working MET for a resistance set (effort during the set, rest excluded). */
export const STRENGTH_MET = 5.0
/** Assumed working time for a strength set that carries no duration of its own. */
export const DEFAULT_STRENGTH_SET_SECONDS = 50

/** Standard MET energy equation. Returns 0 for non-positive inputs. */
export function kcalFromMet(met: number, bodyweightKg: number, minutes: number): number {
  if (met <= 0 || bodyweightKg <= 0 || minutes <= 0) return 0
  return (met * 3.5 * bodyweightKg) / 200 * minutes
}

function categorize(title: string): Category {
  const t = title.toLowerCase()
  if (/(run|jog|sprint)/.test(t)) return 'foot'
  if (/hik/.test(t)) return 'hike'
  if (/(walk|treadmill|ruck|march)/.test(t)) return 'foot'
  if (/(cycl|bike|spin|peloton)/.test(t)) return 'cycling'
  if (/row/.test(t)) return 'rowing'
  if (/swim/.test(t)) return 'swimming'
  if (/elliptical/.test(t)) return 'elliptical'
  if (/(stair|step ?mill)/.test(t)) return 'stairs'
  if (/(yoga|stretch|mobility|pilates)/.test(t)) return 'mobility'
  return 'strength'
}

/** MET for walking/running by speed (km/h). Compendium-of-Physical-Activities buckets. */
function footMet(speedKmh: number | null): number {
  if (speedKmh == null) return 3.5 // unknown pace → moderate walk
  if (speedKmh < 3.2) return 2.8
  if (speedKmh < 4.0) return 3.0
  if (speedKmh < 4.8) return 3.5
  if (speedKmh < 5.6) return 4.3
  if (speedKmh < 6.4) return 5.0
  if (speedKmh < 8.0) return 7.0 // slow jog
  if (speedKmh < 9.7) return 8.3
  if (speedKmh < 11.3) return 9.8
  if (speedKmh < 12.9) return 11.0
  return 11.8
}

function speedKmh(set: BurnSet): number | null {
  const { distanceKm: km, durationSeconds: sec } = set
  if (km == null || sec == null || sec <= 0) return null
  return km / (sec / 3600)
}

function metForCategory(cat: Category, set: BurnSet): number {
  switch (cat) {
    case 'foot':
      return footMet(speedKmh(set))
    case 'hike':
      return 6.0
    case 'cycling':
      return 7.5
    case 'rowing':
      return 7.0
    case 'swimming':
      return 7.0
    case 'elliptical':
      return 5.0
    case 'stairs':
      return 8.0
    case 'mobility':
      return 2.5
    case 'strength':
      return STRENGTH_MET
  }
}

/** Estimated MET for a single logged set. */
export function metForExercise(set: BurnSet): number {
  return metForCategory(categorize(set.exerciseTitle), set)
}

/**
 * Estimated kcal for one logged set.
 * - Timed sets (cardio, planks, etc.) use their own duration.
 * - Untimed resistance sets fall back to DEFAULT_STRENGTH_SET_SECONDS.
 * - Untimed cardio (no way to know how long) contributes 0 — we never guess time
 *   for an activity we can't bound.
 */
export function setBurnKcal(set: BurnSet, bodyweightKg: number): number {
  const cat = categorize(set.exerciseTitle)
  const met = metForCategory(cat, set)
  const seconds =
    set.durationSeconds ?? (cat === 'strength' ? DEFAULT_STRENGTH_SET_SECONDS : 0)
  return kcalFromMet(met, bodyweightKg, seconds / 60)
}

/** Total estimated kcal across a list of sets (one workout, or a whole day). */
export function burnKcal(sets: BurnSet[], bodyweightKg: number): number {
  return sets.reduce((sum, s) => sum + setBurnKcal(s, bodyweightKg), 0)
}
