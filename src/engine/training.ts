export interface SetEntry {
  reps: number
  weightKg: number
  /** Muscle group this set counts toward (e.g. 'chest', 'back'). */
  muscle?: string
}

/** Volume load (tonnage) for a single set = reps × weight. */
export function setVolume({ reps, weightKg }: SetEntry): number {
  return reps * weightKg
}

/** Total volume load across a list of sets. */
export function totalVolume(sets: SetEntry[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0)
}

/** Weekly working-set count per muscle group. */
export function weeklySetsPerMuscle(sets: SetEntry[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const s of sets) {
    const key = s.muscle ?? 'unspecified'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

/** Estimated 1RM — Epley formula. Exact at 1 rep. */
export function oneRepMaxEpley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
}

/** Estimated 1RM — Brzycki formula. */
export function oneRepMaxBrzycki(weightKg: number, reps: number): number {
  return (weightKg * 36) / (37 - reps)
}
