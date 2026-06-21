import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SCREENING_ITEMS,
  currentStage,
  electrolyteTargets,
  FAST_STAGES,
  fastTypePolicy,
  gki,
  hyponatremiaRisk,
  ketosisZone,
  refeedPlan,
  scoreScreening,
  symptomTriage,
  type FastKind,
} from '../../engine'
import { Button, Card, Field, NumberInput, Select, Stat } from '../../ui/components'
import { C } from '../../ui/chart-theme'
import { useFetch } from '../../lib/useFetch'
import { endFast, getActiveFast, getLatestScreening, getLog, saveScreening, startFast, upsertLog } from '../../db/queries'
import type { FastRow } from '../../db/types'
import { today } from '../../lib/dates'

/** Format elapsed hours as `Dd HH:MM:SS` (drops the day part under 24h). */
function formatElapsed(hours: number): string {
  const total = Math.max(0, Math.floor(hours * 3600))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return (d > 0 ? `${d}d ` : '') + `${pad(h)}:${pad(m)}:${pad(s)}`
}

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

function BiomarkerCard() {
  const todayLog = useFetch(() => getLog(today()), [])
  const [bhb, setBhb] = useState('')
  const [glucose, setGlucose] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => {
    const r = todayLog.data
    if (!r) return
    // Hydrate the form from today's loaded record.
    /* eslint-disable react-hooks/set-state-in-effect */
    setBhb(r.measured_bhb_mmol?.toString() ?? '')
    setGlucose(r.measured_glucose_mgdl?.toString() ?? '')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [todayLog.data])

  const bhbN = bhb === '' ? null : +bhb
  const gluN = glucose === '' ? null : +glucose
  const zone = bhbN != null ? ketosisZone(bhbN) : null
  const idx = bhbN != null && gluN != null ? gki(gluN, bhbN) : null

  async function save() {
    setStatus('Saving…')
    try {
      await upsertLog({ log_date: today(), measured_bhb_mmol: bhbN, measured_glucose_mgdl: gluN })
      setStatus('Logged ✓')
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  return (
    <Card title="Biomarkers (measured)">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <Field label="Blood ketones (mmol/L)">
          <NumberInput step="0.1" value={bhb} onChange={(e) => setBhb(e.target.value)} />
        </Field>
        <Field label="Glucose (mg/dL)">
          <NumberInput value={glucose} onChange={(e) => setGlucose(e.target.value)} />
        </Field>
        <Button onClick={save}>Log today</Button>
        {status && <span className="text-sm text-[var(--color-muted)]">{status}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
        <Stat label="Ketosis" value={zone ?? '—'} tone={C.fat} />
        <Stat label="GKI" value={idx == null ? '—' : String(idx)} />
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Honest error bars: fingerstick BHB ±15%; glucose meters are unreliable below ~80 mg/dL (exactly the
        fasting range) — a low reading with symptoms = treat as possible hypo. GKI shown only in ketosis
        (BHB ≥ 0.4). Urine ketone strips drift with hydration.
      </p>
    </Card>
  )
}

function PrepCard({ kind }: { kind: FastKind }) {
  const policy = fastTypePolicy(kind)
  return (
    <Card title="Prep — 24–48h before">
      {policy.hydrationAdvice ? (
        <ul className="text-sm flex flex-col gap-1 list-disc list-inside">
          <li>Optional light taper: lower carbs the day before to ease the glycogen drop.</li>
          <li>Pre-stock electrolytes (LMNT / snake juice / Lite Salt) so day 1 isn't a scramble.</li>
          <li>Front-load water and have a solid last meal with protein + sodium.</li>
        </ul>
      ) : (
        <ul className="text-sm flex flex-col gap-1 list-disc list-inside">
          <li>
            <strong>Hydration-LOAD</strong> well before the window — you can't drink during a dry/religious fast.
          </li>
          <li>
            <strong>Cut sodium &amp; spicy food</strong> ~24h before (reduces thirst during the fast — the
            opposite of a water fast).
          </li>
          <li>Taper caffeine over the prior days to avoid withdrawal headaches.</li>
          <li>Pre-measure any permitted rescue sip (e.g. a halachic cheekful) ahead of time.</li>
        </ul>
      )}
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Sodium guidance literally inverts by fast type — water fasts supplement <em>during</em>; dry/religious
        fasts cut <em>before</em>.
      </p>
    </Card>
  )
}

function FastMode({
  fast,
  elapsedHours,
  onChange,
}: {
  fast: FastRow | null
  elapsedHours: number | null
  onChange: () => void
}) {
  const [kind, setKind] = useState<FastKind>('extended_water')
  const [target, setTarget] = useState(48)
  const [startedAt, setStartedAt] = useState('')
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    try {
      const iso = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString()
      await startFast({ fast_type: kind, started_at: iso, target_hours: target || null })
      onChange()
    } finally {
      setBusy(false)
    }
  }
  async function breakFast() {
    if (!fast) return
    setBusy(true)
    try {
      await endFast(fast.id, new Date().toISOString())
      onChange()
    } finally {
      setBusy(false)
    }
  }

  if (fast && elapsedHours != null) {
    const stage = currentStage(elapsedHours)
    const policy = fastTypePolicy(fast.fast_type)
    const pct = fast.target_hours ? Math.min(100, (elapsedHours / fast.target_hours) * 100) : null
    return (
      <Card title={`Active fast · ${fast.fast_type.replace('_', ' ')}`}>
        <div className="flex flex-col items-center py-2">
          <span className="font-mono text-5xl font-medium tabular-nums">{formatElapsed(elapsedHours)}</span>
          <span className="mt-2 text-sm text-[var(--color-muted)]">
            {stage.label}
            {stage.speculative && ' (estimated)'}
          </span>
          {pct != null && (
            <div className="mt-3 w-full max-w-sm">
              <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.trend }} />
              </div>
              <p className="mt-1 text-center font-mono text-xs text-[var(--color-muted)]">
                {elapsedHours.toFixed(1)} / {fast.target_hours} h
              </p>
            </div>
          )}
        </div>
        {policy.dryCeilingHours != null && elapsedHours > policy.dryCeilingHours && (
          <p className="mb-3 text-center text-sm text-[var(--color-danger)]">
            ⚠ Past the ~{policy.dryCeilingHours}h dry-fast safety ceiling — consider breaking.
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={breakFast} disabled={busy}>
            {busy ? '…' : 'Break fast'}
          </Button>
          <span className="font-mono text-xs text-[var(--color-muted)]">
            started {new Date(fast.started_at).toLocaleString()}
          </span>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Start a fast">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as FastKind)}>
            {FAST_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Target hours (optional)">
          <NumberInput value={target} onChange={(e) => setTarget(+e.target.value)} />
        </Field>
        <Field label="Started (blank = now)">
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2"
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button onClick={start} disabled={busy}>
          {busy ? 'Starting…' : 'Start fast'}
        </Button>
      </div>
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

  // Persist screening to the DB (cross-device, owned). Load latest on mount;
  // save (debounced) only on real user edits so the load doesn't echo back.
  const dirty = useRef(false)
  useEffect(() => {
    getLatestScreening()
      .then((r) => r && setSelected(r.items))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!dirty.current) return
    const res = scoreScreening(selected)
    const id = setTimeout(() => saveScreening(selected, res.score, res.band).catch(() => {}), 800)
    return () => clearTimeout(id)
  }, [selected])
  const changeScreening = (keys: string[]) => {
    dirty.current = true
    setSelected(keys)
  }

  const activeFast = useFetch(() => getActiveFast(), [])
  const fast = activeFast.data ?? null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedHours = fast ? (now - Date.parse(fast.started_at)) / 3_600_000 : null

  const [manualKind, setManualKind] = useState<FastKind>('extended_water')
  const [manualHours, setManualHours] = useState(36)
  const [weightKg, setWeightKg] = useState(80)
  const [waterMl, setWaterMl] = useState(3000)
  const [sodiumMg, setSodiumMg] = useState(1000)

  const kind: FastKind = fast ? (fast.fast_type as FastKind) : manualKind
  const hours = elapsedHours ?? manualHours

  const screening = useMemo(() => scoreScreening(selected), [selected])
  const policy = fastTypePolicy(kind)
  const adviceOn = screening.adviceUnlocked

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Fasting</h1>

      <FastMode fast={fast} elapsedHours={elapsedHours} onChange={activeFast.refetch} />

      <ScreeningCard selected={selected} onChange={changeScreening} />

      <Card title={fast ? 'Context for advice' : 'Your fast (manual)'}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {!fast && (
            <>
              <Field label="Type">
                <Select value={manualKind} onChange={(e) => setManualKind(e.target.value as FastKind)}>
                  {FAST_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hours fasted">
                <NumberInput value={manualHours} onChange={(e) => setManualHours(+e.target.value)} />
              </Field>
            </>
          )}
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
        {!fast && policy.dryCeilingHours != null && hours > policy.dryCeilingHours && (
          <p className="mt-3 text-sm text-[var(--color-danger)]">
            ⚠ Past the ~{policy.dryCeilingHours}h safety ceiling for a dry fast — strongly consider breaking it.
          </p>
        )}
      </Card>

      {!fast && <PrepCard kind={kind} />}

      <StageTimeline hours={hours} />

      <BiomarkerCard />

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
