import { describe, expect, it } from 'vitest'
import { scoreScreening } from './screening'
import {
  currentStage,
  electrolyteTargets,
  fastTypePolicy,
  gki,
  hyponatremiaRisk,
  ketosisZone,
  refeedPlan,
  symptomTriage,
} from './fasting-safety'

describe('biomarkers', () => {
  it('classifies ketosis zones by BHB', () => {
    expect(ketosisZone(0.2)).toBe('none')
    expect(ketosisZone(0.7)).toBe('light')
    expect(ketosisZone(2.0)).toBe('nutritional')
    expect(ketosisZone(3.5)).toBe('deep')
  })
  it('computes GKI and suppresses it below ketosis', () => {
    expect(gki(72, 2.0)).toBeCloseTo(2.0, 1) // (72/18)/2 = 2
    expect(gki(90, 0.3)).toBeNull()
  })
})

describe('scoreScreening', () => {
  it('bands a clean profile as low (advice unlocked)', () => {
    const r = scoreScreening([])
    expect(r.band).toBe('low')
    expect(r.adviceUnlocked).toBe(true)
  })
  it('sums points into moderate', () => {
    const r = scoreScreening(['insulin_sulfonylurea']) // 4 pts → moderate (>3)
    expect(r.score).toBe(4)
    expect(r.band).toBe('moderate')
  })
  it('hard-blocks on an absolute exclusion regardless of score', () => {
    const r = scoreScreening(['anorexia_history'])
    expect(r.band).toBe('high')
    expect(r.autoHigh).toBe(true)
    expect(r.adviceUnlocked).toBe(false)
  })
  it('crosses into high past 6 points', () => {
    const r = scoreScreening(['insulin_sulfonylurea', 'diuretics_lithium_sglt2']) // 7
    expect(r.band).toBe('high')
  })
})

describe('fastTypePolicy — the dry/religious inversion', () => {
  it('water fast gets hydration + electrolyte advice + refeed', () => {
    const p = fastTypePolicy('extended_water')
    expect(p.hydrationAdvice).toBe(true)
    expect(p.electrolyteAdvice).toBe(true)
    expect(p.refeedApplies).toBe(true)
  })
  it('dry fast SUPPRESSES hydration/electrolyte advice and caps hours', () => {
    const p = fastTypePolicy('dry')
    expect(p.hydrationAdvice).toBe(false)
    expect(p.electrolyteAdvice).toBe(false)
    expect(p.dryCeilingHours).toBe(24)
  })
  it('religious turns off hydration, electrolytes, energy tracking', () => {
    const p = fastTypePolicy('religious')
    expect(p.hydrationAdvice).toBe(false)
    expect(p.energyTracking).toBe(false)
  })
})

describe('electrolyteTargets', () => {
  it('returns null for dry/religious (no electrolyte advice)', () => {
    expect(electrolyteTargets('dry', 30)).toBeNull()
    expect(electrolyteTargets('religious', 20)).toBeNull()
  })
  it('caps potassium at 2g supplemental on a water fast', () => {
    const plan = electrolyteTargets('extended_water', 48)!
    expect(plan.potassium.ceilingMg).toBe(2000)
    expect(plan.potassium.targetMg).toBeLessThanOrEqual(plan.potassium.ceilingMg)
    expect(plan.sodium.targetMg).toBeGreaterThan(3000)
  })
})

describe('hyponatremiaRisk', () => {
  it('warns on high water + low sodium during a water fast', () => {
    expect(hyponatremiaRisk('extended_water', 4000, 800)).toMatch(/sodium/i)
  })
  it('never fires on a dry fast (no hydration advice)', () => {
    expect(hyponatremiaRisk('dry', 4000, 0)).toBeNull()
  })
})

describe('currentStage', () => {
  it('maps hours to the right stage and flags autophagy as speculative', () => {
    expect(currentStage(2).key).toBe('fed')
    expect(currentStage(14).key).toBe('glycogen')
    const autophagy = currentStage(30)
    expect(autophagy.key).toBe('autophagy')
    expect(autophagy.speculative).toBe(true)
    expect(currentStage(200).key).toBe('prolonged')
  })
})

describe('refeedPlan', () => {
  it('uses half-the-fast-length, NICE kcal ramp, thiamine gate', () => {
    const p = refeedPlan(6, 80, 'low')
    expect(p.refeedDays).toBe(3) // ceil(6/2)
    expect(p.kcalPerKg).toBe(10)
    expect(p.kcalDay1).toBe(800)
    expect(p.thiamineBeforeCarbs).toBe(true)
  })
  it('drops to 5 kcal/kg and advises bloodwork for high-risk / long fasts', () => {
    const p = refeedPlan(9, 80, 'high')
    expect(p.kcalPerKg).toBe(5)
    expect(p.bloodworkAdvised).toBe(true)
  })
})

describe('symptomTriage', () => {
  it('hard-stops on palpitations regardless of fast type', () => {
    expect(symptomTriage('palpitations', 'extended_water').tier).toBe('hardstop')
  })
  it('routes deficiency symptoms to electrolytes on a water fast', () => {
    expect(symptomTriage('headache', 'extended_water').action).toMatch(/sodium|electrolyte/i)
  })
  it('on a dry fast, deficiency routes to ending the fast, never to drinking', () => {
    const v = symptomTriage('dizziness', 'dry')
    expect(v.action).not.toMatch(/drink|sip water/i)
    expect(v.action).toMatch(/end|breaking/i)
  })
})
