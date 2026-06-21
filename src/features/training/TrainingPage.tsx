import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useFetch } from '../../lib/useFetch'
import { getVolumePoints } from '../../db/queries'
import type { VolumePoint } from '../../engine/training/volume'
import { exerciseList, weeklyExerciseSeries, weeklyVolumeByMuscle } from '../../engine/training/volume'
import type { MuscleGroup } from '../../engine/training/muscles'
import { Card, Select, Stat } from '../../ui/components'

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

const tooltipStyle = { background: '#f2f0e2', border: '1px solid #d6d1be', color: '#1c1a14', fontSize: 12 }

function MuscleChart({ points }: { points: VolumePoint[] }) {
  const { weeks, muscles } = useMemo(() => weeklyVolumeByMuscle(points), [points])
  return (
    <Card title="Weekly volume by muscle group (kg·reps)">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={weeks}>
          <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
          <XAxis dataKey="week" stroke="#6f6a59" fontSize={11} />
          <YAxis stroke="#6f6a59" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {muscles.map((m) => (
            <Line key={m} type="monotone" dataKey={m} stroke={MUSCLE_COLORS[m]} dot={false} strokeWidth={2} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

function ExerciseChart({ points }: { points: VolumePoint[] }) {
  const exercises = useMemo(() => exerciseList(points), [points])
  const [selected, setSelected] = useState('')
  const current = selected || exercises[0] || ''
  const series = useMemo(() => weeklyExerciseSeries(points, current), [points, current])

  return (
    <Card title="Per-exercise progression">
      <Select value={current} onChange={(e) => setSelected(e.target.value)} className="mb-4">
        {exercises.map((ex) => (
          <option key={ex} value={ex}>
            {ex}
          </option>
        ))}
      </Select>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={series}>
          <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
          <XAxis dataKey="week" stroke="#6f6a59" fontSize={11} />
          <YAxis yAxisId="vol" stroke="#6f6a59" fontSize={11} />
          <YAxis yAxisId="orm" orientation="right" stroke="#da6e52" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="vol" dataKey="volume" name="Volume" fill="#4f7d63" radius={[3, 3, 0, 0]} />
          <Line yAxisId="orm" type="monotone" dataKey="est1rm" name="Est. 1RM" stroke="#da6e52" strokeWidth={2} dot={false} />
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
    const volume = working.reduce((n, p) => n + (p.weightKg! * p.reps!), 0)
    const dates = [...new Set(points.map((p) => p.date))].sort()
    return { sets: working.length, volume, from: dates[0] ?? '—', span: dates.length }
  }, [points])

  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (loading) return <p className="text-[var(--color-muted)]">Loading…</p>
  if (!points.length)
    return (
      <Card>
        <p className="text-sm text-[var(--color-muted)]">
          No workouts yet — <Link to="/import" className="text-[var(--color-accent)] underline">import your Hevy CSV</Link> to
          see volume charts per muscle group and exercise.
        </p>
      </Card>
    )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Working sets" value={totals.sets.toLocaleString()} />
        <Stat label="Total volume" value={Math.round(totals.volume).toLocaleString()} unit="kg·reps" tone="var(--color-accent)" />
        <Stat label="Days trained" value={String(totals.span)} />
        <Stat label="Since" value={totals.from} />
      </div>
      <MuscleChart points={points} />
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
