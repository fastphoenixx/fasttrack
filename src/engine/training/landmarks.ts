import type { MuscleGroup } from './muscles'

// Weekly working-set volume landmarks (Renaissance Periodization style):
//  MEV = minimum effective volume, MAV = maximum adaptive volume (the
//  productive band), MRV = maximum recoverable volume (overreaching past it).
// Sets per muscle per week. Approximate, population-level guidance — an
// estimate to frame your own volume, not a prescription.

export interface Landmark {
  mev: number
  mav: number
  mrv: number
}

const LANDMARKS: Partial<Record<MuscleGroup, Landmark>> = {
  chest: { mev: 8, mav: 16, mrv: 22 },
  back: { mev: 10, mav: 20, mrv: 25 },
  shoulders: { mev: 8, mav: 18, mrv: 26 },
  biceps: { mev: 8, mav: 16, mrv: 20 },
  triceps: { mev: 8, mav: 16, mrv: 20 },
  quads: { mev: 8, mav: 16, mrv: 20 },
  hamstrings: { mev: 6, mav: 14, mrv: 20 },
  glutes: { mev: 6, mav: 16, mrv: 25 },
  calves: { mev: 8, mav: 16, mrv: 20 },
  abs: { mev: 6, mav: 16, mrv: 25 },
}

/** Landmark set-range for a muscle, or null if none is defined (neck/cardio/other). */
export function landmarkFor(muscle: MuscleGroup): Landmark | null {
  return LANDMARKS[muscle] ?? null
}
