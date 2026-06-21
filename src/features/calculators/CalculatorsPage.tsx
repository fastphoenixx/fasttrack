import { useMemo, useState } from 'react'
import {
  bmr,
  bodyFatNavy,
  ffmi,
  leanBodyMass,
  macroTargets,
  normalizedFfmi,
  oneRepMaxBrzycki,
  oneRepMaxEpley,
  targetCalories,
  tdee,
  type ActivityLevel,
  type BmrFormula,
  type Goal,
  type Sex,
} from '../../engine'
import { Card, Field, NumberInput, Select, Stat } from '../../ui/components'

const round = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—')

function EnergyCalculator() {
  const [sex, setSex] = useState<Sex>('male')
  const [weightKg, setWeight] = useState(80)
  const [heightCm, setHeight] = useState(180)
  const [ageYears, setAge] = useState(30)
  const [bodyFat, setBodyFat] = useState(15)
  const [formula, setFormula] = useState<BmrFormula>('mifflin')
  const [activity, setActivity] = useState<ActivityLevel>('moderate')
  const [goal, setGoal] = useState<Goal>('cut')

  const result = useMemo(() => {
    const bmrValue = bmr(formula, {
      sex,
      weightKg,
      heightCm,
      ageYears,
      bodyFatFraction: bodyFat / 100,
    })
    const tdeeValue = tdee(bmrValue, activity)
    const target = targetCalories(tdeeValue, goal)
    const macros = macroTargets({ calories: target, weightKg })
    return { bmrValue, tdeeValue, target, macros }
  }, [sex, weightKg, heightCm, ageYears, bodyFat, formula, activity, goal])

  return (
    <Card title="Energy & Macros (TDEE)">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Sex">
          <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </Field>
        <Field label="Weight (kg)">
          <NumberInput value={weightKg} onChange={(e) => setWeight(+e.target.value)} />
        </Field>
        <Field label="Height (cm)">
          <NumberInput value={heightCm} onChange={(e) => setHeight(+e.target.value)} />
        </Field>
        <Field label="Age">
          <NumberInput value={ageYears} onChange={(e) => setAge(+e.target.value)} />
        </Field>
        <Field label="Body fat (%)">
          <NumberInput value={bodyFat} onChange={(e) => setBodyFat(+e.target.value)} />
        </Field>
        <Field label="Formula">
          <Select value={formula} onChange={(e) => setFormula(e.target.value as BmrFormula)}>
            <option value="mifflin">Mifflin-St Jeor</option>
            <option value="harris_benedict">Harris-Benedict</option>
            <option value="katch_mcardle">Katch-McArdle (uses BF%)</option>
          </Select>
        </Field>
        <Field label="Activity">
          <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </Select>
        </Field>
        <Field label="Goal">
          <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            <option value="cut">Cut (-20%)</option>
            <option value="maintain">Maintain</option>
            <option value="bulk">Bulk (+10%)</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[var(--color-border)]">
        <Stat label="BMR" value={round(result.bmrValue)} unit="kcal" />
        <Stat label="TDEE" value={round(result.tdeeValue)} unit="kcal" />
        <Stat label="Target" value={round(result.target)} unit="kcal" tone="var(--color-accent)" />
        <Stat label="Protein" value={round(result.macros.proteinG)} unit="g" tone="var(--color-protein)" />
        <Stat label="Carbs" value={round(result.macros.carbG)} unit="g" />
        <Stat label="Fat" value={round(result.macros.fatG)} unit="g" />
      </div>
    </Card>
  )
}

function BodyFatCalculator() {
  const [sex, setSex] = useState<Sex>('male')
  const [heightCm, setHeight] = useState(180)
  const [neckCm, setNeck] = useState(38)
  const [waistCm, setWaist] = useState(85)
  const [hipCm, setHip] = useState(95)
  const [weightKg, setWeight] = useState(80)

  const result = useMemo(() => {
    try {
      const bf = bodyFatNavy({ sex, heightCm, neckCm, waistCm, hipCm: sex === 'female' ? hipCm : undefined })
      const lbm = leanBodyMass(weightKg, bf / 100)
      return { bf, lbm, ffmi: ffmi(lbm, heightCm), nffmi: normalizedFfmi(lbm, heightCm) }
    } catch {
      return null
    }
  }, [sex, heightCm, neckCm, waistCm, hipCm, weightKg])

  return (
    <Card title="Body Composition (US Navy)">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Sex">
          <Select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </Field>
        <Field label="Weight (kg)">
          <NumberInput value={weightKg} onChange={(e) => setWeight(+e.target.value)} />
        </Field>
        <Field label="Height (cm)">
          <NumberInput value={heightCm} onChange={(e) => setHeight(+e.target.value)} />
        </Field>
        <Field label="Neck (cm)">
          <NumberInput value={neckCm} onChange={(e) => setNeck(+e.target.value)} />
        </Field>
        <Field label="Waist (cm)">
          <NumberInput value={waistCm} onChange={(e) => setWaist(+e.target.value)} />
        </Field>
        {sex === 'female' && (
          <Field label="Hip (cm)">
            <NumberInput value={hipCm} onChange={(e) => setHip(+e.target.value)} />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[var(--color-border)]">
        <Stat label="Body fat" value={round(result?.bf ?? NaN, 1)} unit="%" tone="var(--color-surplus)" />
        <Stat label="Lean mass" value={round(result?.lbm ?? NaN, 1)} unit="kg" />
        <Stat label="FFMI" value={round(result?.ffmi ?? NaN, 1)} />
        <Stat label="Norm. FFMI" value={round(result?.nffmi ?? NaN, 1)} />
      </div>
    </Card>
  )
}

function OneRepMaxCalculator() {
  const [weightKg, setWeight] = useState(100)
  const [reps, setReps] = useState(5)
  return (
    <Card title="1RM Estimate">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <NumberInput value={weightKg} onChange={(e) => setWeight(+e.target.value)} />
        </Field>
        <Field label="Reps">
          <NumberInput value={reps} onChange={(e) => setReps(+e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-[var(--color-border)]">
        <Stat label="Epley" value={round(oneRepMaxEpley(weightKg, reps), 1)} unit="kg" />
        <Stat label="Brzycki" value={round(oneRepMaxBrzycki(weightKg, reps), 1)} unit="kg" />
      </div>
    </Card>
  )
}

export function CalculatorsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Calculators</h1>
      <EnergyCalculator />
      <BodyFatCalculator />
      <OneRepMaxCalculator />
    </div>
  )
}
