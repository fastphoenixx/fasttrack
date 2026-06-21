import { useEffect, useMemo, useState } from 'react'
import {
  SCREENING_ITEMS,
  currentStage,
  electrolyteTargets,
  FAST_STAGES,
  fastTypePolicy,
  hyponatremiaRisk,
  refeedPlan,
  scoreScreening,
  symptomTriage,
  type FastKind,
} from '../../engine'
import { Card, Field, NumberInput, Select, Stat } from '../../ui/components'
import { C } from '../../ui/chart-theme'

const SCREEN_KEY = 'ft_screening_v1'
const FAST_KINDS: FastKind[] = ['extended_water', 'dry', 'religious', 'omad', 'intermittent']
const SYMPTOMS = ['headache', 'fatigue', 'cramps', 'dizziness', 'nausea', 'insomnia', 'palpitations', 'fainting', 'confusion', 'severe_weakness']

const BAND_TONE = { low: C.fat, moderate: C.surplus, high: C.danger } as const

function ScreeningCard({ selected, onChange }: { selected: string[]; onChange: (keys: string[]) => void }) {
  const result = useMemo(() => scoreScreening(selected), [selected])
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])

  return (
    <Card title="Medical screening — do this first">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {SCREENING_ITEMS.map((item) => (
          <label key={item.key} className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selected.includes(item.key)} onChange={() => toggle(item.key)} className="mt-1" />
            <span>
              {item.label}
              <span className="font-mono text-[var(--color-muted)]">
                {' '}
                {item.autoHigh ? '· exclusion' : `· +${item.points}`}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <Stat label="Risk score" value={String(result.score)} />
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Risk band</span>
          <span className="font-mono text-2xl font-medium uppercase" style={{ color: BAND_TONE[result.band] }}>
            {result.band}
          </span>
        </div>
      </div>
      {result.band === 'high' && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">
          High risk — advice features are off. Please consult a clinician before an extended fast. Safety
          information below stays visible.
        </p>
      )}
    </Card>
  )
}

function StageTimeline({ hours }: { hours: number }) {
  const stage = currentStage(hours)
  return (
    <Card title="Where you are — fasting stages">
      <div className="flex flex-col gap-1">
        {FAST_STAGES.map((s) => {
          const active = s.key === stage.key
          return (
            <div
              key={s.key}
              className="flex items-baseline gap-3 rounded-md px-3 py-2"
              style={active ? { background: 'var(--color-signal)' } : undefined}
            >
              <span className="font-mono text-xs text-[var(--color-muted)] w-14 shrink-0">{s.fromHours}h+</span>
              <div>
                <span className="font-medium">
                  {s.label}
                  {s.speculative && <span className="ml-2 text-xs text-[var(--color-muted)]">estimated · emerging evidence</span>}
                </span>
                <p className="text-xs text-[var(--color-muted)]">{s.mechanism}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function MineralCard({ kind, hours, waterMl, sodiumLogged }: { kind: FastKind; hours: number; waterMl: number; sodiumLogged: number }) {
  const plan = electrolyteTargets(kind, hours)
  const warn = hyponatremiaRisk(kind, waterMl, sodiumLogged)
  if (!plan) {
    return (
      <Card title="Electrolytes">
        <p className="text-sm text-[var(--color-muted)]">
          On a {kind} fast there's no water/electrolyte target — taking water or salt would break the fast.
          The only safe correction for distress is to <span className="text-[var(--color-text)]">break the fast</span>.
          Front-load hydration <em>before</em> you start instead.
        </p>
      </Card>
    )
  }
  return (
    <Card title="Daily mineral budget (targets · hard caps)">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Sodium" value={plan.sodium.targetMg.toLocaleString()} unit={`mg · ≤${(plan.sodium.ceilingMg / 1000)}g`} tone={C.trend} />
        <Stat label="Potassium" value={plan.potassium.targetMg.toLocaleString()} unit={`mg · ≤${(plan.potassium.ceilingMg / 1000)}g`} tone={C.protein} />
        <Stat label="Magnesium" value={plan.magnesium.targetMg.toLocaleString()} unit={`mg · ≤${plan.magnesium.ceilingMg}mg`} tone={C.fat} />
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Potassium is the dangerous one — never bolus; the cap is a hard limit, not a target. Sip across the day.
      </p>
      {warn && <p className="mt-2 text-sm text-[var(--color-danger)]">{warn}</p>}
    </Card>
  )
}

function SymptomCheck({ kind }: { kind: FastKind }) {
  const [symptom, setSymptom] = useState<string | null>(null)
  const verdict = symptom ? symptomTriage(symptom, kind) : null
  return (
    <Card title="How do you feel? (symptom check)">
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymptom(s)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              symptom === s
                ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      {verdict && (
        <div
          className="mt-4 rounded-lg px-4 py-3 text-sm"
          style={
            verdict.tier === 'hardstop'
              ? { background: C.danger, color: '#fff' }
              : { background: 'var(--color-signal)' }
          }
        >
          {verdict.tier === 'hardstop' && <strong className="block mb-1 uppercase tracking-wide">Stop now</strong>}
          {verdict.action}
        </div>
      )}
    </Card>
  )
}

function RefeedCard({ hours, weightKg, band }: { hours: number; weightKg: number; band: 'low' | 'moderate' | 'high' }) {
  const days = Math.max(1, Math.ceil(hours / 24))
  const plan = refeedPlan(days, weightKg, band)
  return (
    <Card title={`Breaking the fast — ${days}-day fast → ${plan.refeedDays}-day refeed`}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Day-1 calories" value={plan.kcalDay1.toLocaleString()} unit="kcal" tone={C.fat} />
        <Stat label="Ramp" value={String(plan.kcalPerKg)} unit="kcal/kg/day" />
        <Stat label="Thiamine first" value="100" unit="mg" tone={C.trend} />
      </div>
      <ol className="mt-4 flex flex-col gap-1 text-sm list-decimal list-inside">
        {plan.ladder.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-[var(--color-danger)]">
        ⚠ Take 100&nbsp;mg thiamine (B1) <em>before</em> the first carbs. Refeeding syndrome's hallmark is falling
        phosphate — which you <strong>cannot feel and we don't track</strong>.
        {plan.bloodworkAdvised && ' Get bloodwork (phosphate/potassium/magnesium) on refeed days 1–3.'}
      </p>
    </Card>
  )
}

function FastingPage() {
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SCREEN_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  useEffect(() => {
    localStorage.setItem(SCREEN_KEY, JSON.stringify(selected))
  }, [selected])

  const [kind, setKind] = useState<FastKind>('extended_water')
  const [hours, setHours] = useState(36)
  const [weightKg, setWeightKg] = useState(80)
  const [waterMl, setWaterMl] = useState(3000)
  const [sodiumMg, setSodiumMg] = useState(1000)

  const screening = useMemo(() => scoreScreening(selected), [selected])
  const policy = fastTypePolicy(kind)
  const adviceOn = screening.adviceUnlocked

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Fasting</h1>

      <ScreeningCard selected={selected} onChange={setSelected} />

      <Card title="Your fast">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as FastKind)}>
              {FAST_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hours fasted">
            <NumberInput value={hours} onChange={(e) => setHours(+e.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <NumberInput value={weightKg} onChange={(e) => setWeightKg(+e.target.value)} />
          </Field>
          {policy.electrolyteAdvice && (
            <>
              <Field label="Water today (ml)">
                <NumberInput value={waterMl} onChange={(e) => setWaterMl(+e.target.value)} />
              </Field>
              <Field label="Sodium today (mg)">
                <NumberInput value={sodiumMg} onChange={(e) => setSodiumMg(+e.target.value)} />
              </Field>
            </>
          )}
        </div>
        {policy.dryCeilingHours != null && hours > policy.dryCeilingHours && (
          <p className="mt-3 text-sm text-[var(--color-danger)]">
            ⚠ Past the ~{policy.dryCeilingHours}h safety ceiling for a dry fast — strongly consider breaking it.
          </p>
        )}
      </Card>

      <StageTimeline hours={hours} />

      {adviceOn ? (
        <>
          <MineralCard kind={kind} hours={hours} waterMl={waterMl} sodiumLogged={sodiumMg} />
          <SymptomCheck kind={kind} />
          {policy.refeedApplies && <RefeedCard hours={hours} weightKg={weightKg} band={screening.band} />}
        </>
      ) : (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            Advice features (electrolyte targets, symptom guidance, refeed plan) are hidden because your
            screening came back <span className="text-[var(--color-danger)]">high risk</span>. Please fast only
            under clinical supervision.
          </p>
        </Card>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        Guidance based on published protocols (IDF-DAR, NICE/ASPEN refeeding, TrueNorth), shown with their
        sources — <strong>not medical advice</strong>. Safety features are always free. When in doubt, consult a
        clinician.
      </p>
    </div>
  )
}

export { FastingPage }
