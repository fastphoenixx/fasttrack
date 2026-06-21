import { useEffect, useState } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { getLog, upsertLog } from '../../db/queries'
import type { DailyLogInput, FastType } from '../../db/types'
import { Button, Card, Field, NumberInput, Select } from '../../ui/components'
import { today } from '../../lib/dates'

const FAST_TYPES: FastType[] = ['none', 'intermittent', 'omad', 'extended_water', 'dry', 'religious']

function num(v: string): number | null {
  return v === '' ? null : +v
}

function LogForm() {
  const [date, setDate] = useState(today())
  const [form, setForm] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<string | null>(null)

  // Load existing log when the date changes.
  useEffect(() => {
    getLog(date)
      .then((row) => {
        if (!row) return setForm({})
        setForm({
          calories_in: row.calories_in?.toString() ?? '',
          protein_g: row.protein_g?.toString() ?? '',
          carb_g: row.carb_g?.toString() ?? '',
          fat_g: row.fat_g?.toString() ?? '',
          water_ml: row.water_ml?.toString() ?? '',
          weight_kg: row.weight_kg?.toString() ?? '',
          fasting_hours: row.fasting_hours?.toString() ?? '',
          fast_type: row.fast_type ?? 'none',
          waist: row.measurements.waist?.toString() ?? '',
          sodium_mg: row.electrolytes.sodium_mg?.toString() ?? '',
          potassium_mg: row.electrolytes.potassium_mg?.toString() ?? '',
          magnesium_mg: row.electrolytes.magnesium_mg?.toString() ?? '',
          notes: row.notes ?? '',
        })
      })
      .catch((e) => {
        console.error(e)
        setStatus(`Load error: ${(e as Error).message}`)
      })
  }, [date])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function register() {
    setStatus('Saving…')
    const input: DailyLogInput = {
      log_date: date,
      calories_in: num(form.calories_in ?? ''),
      protein_g: num(form.protein_g ?? ''),
      carb_g: num(form.carb_g ?? ''),
      fat_g: num(form.fat_g ?? ''),
      water_ml: num(form.water_ml ?? ''),
      weight_kg: num(form.weight_kg ?? ''),
      fasting_hours: num(form.fasting_hours ?? ''),
      fast_type: (form.fast_type as FastType) ?? 'none',
      measurements: form.waist ? { waist: +form.waist } : {},
      electrolytes: {
        ...(form.sodium_mg ? { sodium_mg: +form.sodium_mg } : {}),
        ...(form.potassium_mg ? { potassium_mg: +form.potassium_mg } : {}),
        ...(form.magnesium_mg ? { magnesium_mg: +form.magnesium_mg } : {}),
      },
      notes: form.notes || null,
    }
    try {
      await upsertLog(input)
      setStatus('Registered ✓')
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Day">
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2"
          />
        </Field>
      </Card>

      <Card title="Intake">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['calories_in', 'protein_g', 'carb_g', 'fat_g', 'water_ml'] as const).map((k) => (
            <Field key={k} label={k.replace(/_/g, ' ')}>
              <NumberInput value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Body">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="weight (kg)">
            <NumberInput value={form.weight_kg ?? ''} onChange={(e) => set('weight_kg', e.target.value)} />
          </Field>
          <Field label="waist (cm)">
            <NumberInput value={form.waist ?? ''} onChange={(e) => set('waist', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Fasting & Electrolytes">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="fasting hours">
            <NumberInput value={form.fasting_hours ?? ''} onChange={(e) => set('fasting_hours', e.target.value)} />
          </Field>
          <Field label="fast type">
            <Select value={form.fast_type ?? 'none'} onChange={(e) => set('fast_type', e.target.value)}>
              {FAST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="sodium (mg)">
            <NumberInput value={form.sodium_mg ?? ''} onChange={(e) => set('sodium_mg', e.target.value)} />
          </Field>
          <Field label="potassium (mg)">
            <NumberInput value={form.potassium_mg ?? ''} onChange={(e) => set('potassium_mg', e.target.value)} />
          </Field>
          <Field label="magnesium (mg)">
            <NumberInput value={form.magnesium_mg ?? ''} onChange={(e) => set('magnesium_mg', e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={register}>Register</Button>
        {status && <span className="text-sm text-[var(--color-muted)]">{status}</span>}
      </div>
    </div>
  )
}

export function DailyLogPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Daily Log</h1>
      <AuthGate>
        <LogForm />
      </AuthGate>
    </div>
  )
}
