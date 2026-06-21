import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useFetch } from '../../lib/useFetch'
import { getVolumePoints } from '../../db/queries'
import {
  exerciseList,
  landmarkFor,
  weeklyExerciseSeries,
  weeklySetsByMuscle,
  weeklyVolumeByMuscle,
  type MuscleGroup,
  type VolumePoint,
} from '../../engine'
import { Card, Select, Stat } from '../../ui/components'
import { ChartTooltip } from '../../ui/charts'
import { C, axisProps, gridProps } from '../../ui/chart-theme'

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: '#da6e52',
  back: '#4f7d63',
  shoulders: '#c0863a',
  biceps: '#6e62a6',
  triceps: '#9a5b8f',
  quads: '#3f7e8c',
  hamstrings: '#7a8b3f',
  glutes: '#b4452f',
  calves: '#8a6d3b',
  abs: '#5b7da0',
  neck: '#a07b5b',
  cardio: '#9aa05b',
  other: '#9c958a',
}

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (k: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--color-border)] overflow-hidden text-xs font-mono mb-4">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 transition-colors ${
            value === o.key
              ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
              : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function MuscleVolumeChart({ points }: { points: VolumePoint[] }) {
  const { weeks, muscles } = useMemo(() => weeklyVolumeByMuscle(points), [points])
  return (
    <Card title="Weekly volume by muscle group (kg·reps)">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={weeks}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="week" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {muscles.map((mu) => (
            <Line key={mu} type="monotone" dataKey={mu} stroke={MUSCLE_COLORS[mu]} dot={false} strokeWidth={2} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

function SetsLandmarkChart({ points }: { points: VolumePoint[] }) {
  const { weeks, muscles } = useMemo(() => weeklySetsByMuscle(points), [points])
  const withLandmark = muscles.find((mu) => landmarkFor(mu)) ?? muscles[0]
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('')
  const current = (muscle || withLandmark) as MuscleGroup
  const data = useMemo(() => weeks.map((w) => ({ week: w.week, sets: w[current] ?? 0 })), [weeks, current])
  const lm = landmarkFor(current)

  return (
    <Card title="Weekly working sets per muscle — with MEV/MAV/MRV landmarks">
      <Select value={current} onChange={(e) => setMuscle(e.target.value as MuscleGroup)} className="mb-4">
        {muscles.map((mu) => (
          <option key={mu} value={mu}>
            {mu}
          </option>
        ))}
      </Select>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="week" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip content={<ChartTooltip unit="sets" />} />
          {lm && (
            <>
              <ReferenceArea y1={lm.mev} y2={lm.mav} fill={C.fat} fillOpacity={0.12} />
              <ReferenceArea y1={lm.mav} y2={lm.mrv} fill={C.signal} fillOpacity={0.3} />
              <ReferenceLine y={lm.mev} stroke={C.fat} strokeDasharray="4 3" label={{ value: 'MEV', position: 'insideLeft', fontSize: 10, fill: C.axis }} />
              <ReferenceLine y={lm.mrv} stroke={C.danger} strokeDasharray="4 3" label={{ value: 'MRV', position: 'insideLeft', fontSize: 10, fill: C.danger }} />
            </>
          )}
          <Bar dataKey="sets" name="working sets" fill={C.trend} radius={[3, 3, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {lm
          ? `Productive band ~${lm.mev}–${lm.mav} sets/week; past ${lm.mrv} (MRV) risks under-recovery. RP-style estimate.`
          : 'No landmark band for this group (e.g. neck/cardio).'}
      </p>
    </Card>
  )
}

const EX_METRICS = [
  { key: 'est1rm' as const, label: 'Est. 1RM', unit: 'kg' },
  { key: 'volume' as const, label: 'Volume', unit: 'kg·reps' },
  { key: 'sets' as const, label: 'Sets', unit: '' },
]

function ExerciseChart({ points }: { points: VolumePoint[] }) {
  const exercises = useMemo(() => exerciseList(points), [points])
  const [selected, setSelected] = useState('')
  const [metric, setMetric] = useState<'est1rm' | 'volume' | 'sets'>('est1rm')
  const current = selected || exercises[0] || ''
  const series = useMemo(() => weeklyExerciseSeries(points, current), [points, current])
  const meta = EX_METRICS.find((mm) => mm.key === metric)!

  return (
    <Card title="Per-exercise progression">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={current} onChange={(e) => setSelected(e.target.value)} className="mb-4">
          {exercises.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </Select>
        <Chips value={metric} options={EX_METRICS} onChange={setMetric} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={series}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="week" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<ChartTooltip unit={meta.unit} />} />
          {metric === 'est1rm' ? (
            <Line type="monotone" dataKey="est1rm" name={meta.label} stroke={C.trend} strokeWidth={2.5} dot={{ r: 2 }} />
          ) : (
            <Bar dataKey={metric} name={meta.label} fill={C.fat} radius={[3, 3, 0, 0]} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

function TrainingInner() {
  const { data, error, loading } = useFetch(() => getVolumePoints(), [])
  const points = useMemo(() => data ?? [], [data])

  const totals = useMemo(() => {
    const working = points.filter((p) => p.setType !== 'warmup' && p.weightKg && p.reps)
    const volume = working.reduce((n, p) => n + p.weightKg! * p.reps!, 0)
    const dates = [...new Set(points.map((p) => p.date))].sort()
    return { sets: working.length, volume, from: dates[0] ?? '—', span: dates.length }
  }, [points])

  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (loading) return <p className="text-[var(--color-muted)]">Loading…</p>
  if (!points.length)
    return (
      <Card>
        <p className="text-sm text-[var(--color-muted)]">
          No workouts yet —{' '}
          <Link to="/import" className="text-[var(--color-accent)] underline">
            import your Hevy CSV
          </Link>{' '}
          to see volume charts per muscle group and exercise.
        </p>
      </Card>
    )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Working sets" value={totals.sets.toLocaleString()} />
        <Stat label="Total volume" value={Math.round(totals.volume).toLocaleString()} unit="kg·reps" tone={C.trend} />
        <Stat label="Days trained" value={String(totals.span)} />
        <Stat label="Since" value={totals.from} />
      </div>
      <SetsLandmarkChart points={points} />
      <MuscleVolumeChart points={points} />
      <ExerciseChart points={points} />
    </div>
  )
}

export function TrainingPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Training</h1>
      <AuthGate>
        <TrainingInner />
      </AuthGate>
    </div>
  )
}
