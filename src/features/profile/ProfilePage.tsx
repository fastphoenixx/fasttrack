import { useEffect, useRef, useState } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { getCurrentProfile, saveProfile } from '../../db/queries'
import { Button, Card, Field, NumberInput, Select } from '../../ui/components'
import type { ActivityLevel, BmrFormula, Goal, Sex } from '../../engine'
import { today } from '../../lib/dates'

type ProfileFormState = {
  sex: Sex
  birthdate: string
  height_cm: number
  activity_level: ActivityLevel
  goal: Goal
  protein_per_kg: number
  fat_fraction: number
  bmr_formula: BmrFormula
}

function ProfileForm() {
  const [p, setP] = useState<ProfileFormState>({
    sex: 'male',
    birthdate: '1995-01-01',
    height_cm: 180,
    activity_level: 'moderate',
    goal: 'cut',
    protein_per_kg: 2,
    fat_fraction: 0.25,
    bmr_formula: 'mifflin',
  })
  const [status, setStatus] = useState<string | null>(null)
  // The async load must not clobber edits the user makes while it's in flight.
  const edited = useRef(false)
  const update = (patch: Partial<ProfileFormState>) => {
    edited.current = true
    setP((prev) => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    getCurrentProfile()
      .then((row) => {
        if (!row || edited.current) return
        setP((prev) => ({
          ...prev,
          sex: row.sex,
          birthdate: row.birthdate ?? prev.birthdate,
          height_cm: row.height_cm ?? prev.height_cm,
          activity_level: row.activity_level,
          goal: row.goal,
          protein_per_kg: row.protein_per_kg,
          fat_fraction: row.fat_fraction,
          bmr_formula: row.bmr_formula,
        }))
      })
      .catch((e) => {
        console.error(e)
        setStatus(`Load error: ${(e as Error).message}`)
      })
  }, [])

  return (
    <Card title="Profile">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Sex">
          <Select value={p.sex} onChange={(e) => update({ sex: e.target.value as Sex })}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </Field>
        <Field label="Birthdate">
          <input
            type="date"
            value={p.birthdate}
            onChange={(e) => update({ birthdate: e.target.value })}
            className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2"
          />
        </Field>
        <Field label="Height (cm)">
          <NumberInput value={p.height_cm} onChange={(e) => update({ height_cm: +e.target.value })} />
        </Field>
        <Field label="Activity">
          <Select
            value={p.activity_level}
            onChange={(e) => update({ activity_level: e.target.value as ActivityLevel })}
          >
            {['sedentary', 'light', 'moderate', 'active', 'very_active'].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Goal">
          <Select value={p.goal} onChange={(e) => update({ goal: e.target.value as Goal })}>
            <option value="cut">Cut</option>
            <option value="maintain">Maintain</option>
            <option value="bulk">Bulk</option>
          </Select>
        </Field>
        <Field label="Protein (g/kg)">
          <NumberInput
            step="0.1"
            value={p.protein_per_kg}
            onChange={(e) => update({ protein_per_kg: +e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button
          onClick={async () => {
            setStatus('Saving…')
            try {
              await saveProfile({ ...p, effective_date: today() })
              setStatus('Saved a new profile version.')
            } catch (e) {
              setStatus((e as Error).message)
            }
          }}
        >
          Save profile version
        </Button>
        {status && <span className="text-sm text-[var(--color-muted)]">{status}</span>}
      </div>
    </Card>
  )
}

export function ProfilePage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Profile</h1>
      <AuthGate>
        <ProfileForm />
      </AuthGate>
    </div>
  )
}
