import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AuthGate } from '../auth/AuthGate'
import { useFetch } from '../../lib/useFetch'
import { getBurnPoints, getCurrentProfile, getLogRange, getVolumePoints } from '../../db/queries'
import type { BurnPoint } from '../../db/queries'
import type { DailyLogRow, ProfileRow } from '../../db/types'
import {
  burnKcal,
  cumulativeBalance,
  dailyFatLossKg,
  decomposeFastLoss,
  estimateExpenditure,
  exerciseList,
  projectedMassChangeKg,
  weeklyExerciseSeries,
  weekStart,
  weightTrend,
} from '../../engine'
import { today, daysAgo } from '../../lib/dates'
import { logsToCsv, downloadCsv } from '../data/csv'
import { Button, Card, Select, Stat } from '../../ui/components'
import { ChartTooltip, Gradient, TimeRange } from '../../ui/charts'
import { C, axisProps, gridProps, lastNDays } from '../../ui/chart-theme'

const FAST_TYPES = new Set(['extended_water', 'dry', 'religious', 'omad'])

function expenditureFor(profile: ProfileRow | null, weightKg: number | null): number {
  if (!profile || !weightKg) return 0
  return estimateExpenditure({
    sex: profile.sex,
    heightCm: profile.height_cm ?? 0,
    birthdate: profile.birthdate,
    activity: profile.activity_level,
    bmrFormula: profile.bmr_formula,
    weightKg,
    asOf: today(),
  })
}

/** Group logged sets by their date, as the burn-engine's BurnSet shape. */
function burnByDateFrom(points: BurnPoint[]): Map<string, { exerciseTitle: string; distanceKm: number | null; durationSeconds: number | null }[]> {
  const map = new Map<string, { exerciseTitle: string; distanceKm: number | null; durationSeconds: number | null }[]>()
  for (const p of points) {
    const list = map.get(p.date) ?? []
    list.push({ exerciseTitle: p.exerciseTitle, distanceKm: p.distanceKm, durationSeconds: p.durationSeconds })
    map.set(p.date, list)
  }
  return map
}

function Charts({ rows, profile }: { rows: DailyLogRow[]; profile: ProfileRow | null }) {
  const burn = useFetch(() => getBurnPoints(), [])
  const burnByDate = useMemo(() => burnByDateFrom(burn.data ?? []), [burn.data])
  const m = useMemo(() => {
    // Expenditure is dynamic: a near-baseline TDEE (BMR × profile activity factor)
    // PLUS the energy from that day's logged exercise (MET model). So a 10 km walk
    // actually raises the day's burn — and its fat-loss — instead of being invisible.
    const energy = rows.map((r) => {
      const baseline = expenditureFor(profile, r.weight_kg)
      const exercise = r.weight_kg ? burnKcal(burnByDate.get(r.log_date) ?? [], r.weight_kg) : 0
      return {
        intake: r.calories_in ?? 0,
        expenditure: baseline + exercise,
        exercise,
      }
    })
    const cum = cumulativeBalance(energy)
    const trend = weightTrend(
      rows.map((r) => ({ date: r.log_date, weight: r.weight_kg })),
      0.25,
    )
    const std = trend.residualStd
    const cumFatArr = energy.reduce<number[]>(
      (acc, e) => [...acc, (acc.at(-1) ?? 0) + dailyFatLossKg(e.intake, e.expenditure)],
      [],
    )

    const series = rows.map((r, i) => {
      const t = trend.series[i].trend
      const intake = energy[i].intake
      const exp = energy[i].expenditure
      const exercise = energy[i].exercise
      return {
        date: r.log_date.slice(5),
        weight: r.weight_kg,
        trend: t == null ? null : +t.toFixed(2),
        band: t == null ? null : ([+(t - std).toFixed(2), +(t + std).toFixed(2)] as [number, number]),
        cumFat: +cumFatArr[i].toFixed(2),
        cumBalance: Math.round(cum[i]),
        intake: intake || null,
        expenditure: exp ? Math.round(exp) : null,
        exercise: exercise ? Math.round(exercise) : null,
        deficitDay: exp > 0 && intake <= exp,
      }
    })

    // previous weigh-in helper for fast decomposition
    const prevWeight = (i: number): number | null => {
      for (let j = i - 1; j >= 0; j--) if (rows[j].weight_kg != null) return rows[j].weight_kg
      return null
    }
    const fastDecomp = rows
      .map((r, i) => {
        if (!r.fast_type || !FAST_TYPES.has(r.fast_type) || r.weight_kg == null) return null
        const prev = prevWeight(i)
        if (prev == null || prev <= r.weight_kg) return null
        const d = decomposeFastLoss(prev - r.weight_kg, r.fasting_hours ?? 24, energy[i].expenditure - energy[i].intake)
        return {
          date: r.log_date.slice(5),
          water: +d.glycogenWaterKg.toFixed(2),
          fat: +d.fatLossKg.toFixed(2),
          other: +d.otherKg.toFixed(2),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)

    const last = energy[energy.length - 1]
    const fatToday = last ? dailyFatLossKg(last.intake, last.expenditure) : 0
    const withExp = energy.filter((e) => e.expenditure > 0)
    const avgDeficit = withExp.length
      ? Math.round(withExp.reduce((s, e) => s + (e.expenditure - e.intake), 0) / withExp.length)
      : 0
    const recent = fastDecomp.at(-1)

    return {
      series,
      fastDecomp,
      totalNet: cum.at(-1) ?? 0,
      fatToday,
      cumFat: cumFatArr.at(-1) ?? 0,
      deviation: trend.lastDeviation,
      noise: std,
      avgDeficit,
      recent,
    }
  }, [rows, profile, burnByDate])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Fat lost today (est.)" value={m.fatToday.toFixed(2)} unit="kg" tone={C.fat} />
        <Stat label="True fat lost · period" value={m.cumFat.toFixed(2)} unit="kg" tone={C.fat} />
        <Stat
          label="Scale vs trend today"
          value={m.deviation == null ? '—' : `${m.deviation > 0 ? '+' : ''}${m.deviation.toFixed(2)}`}
          unit="kg"
          tone={C.axis}
        />
        <Stat label="Days logged" value={String(rows.length)} />
      </div>

      <p className="text-xs text-[var(--color-muted)] -mt-2">
        Fat loss is estimated from your energy deficit (≈ deficit ÷ 7700 kcal/kg), not the scale — daily
        weight swings are mostly water &amp; glycogen. An estimate, not a measurement.
      </p>

      {m.recent && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-signal)] px-5 py-4 text-sm">
          Last fast (<span className="font-mono">{m.recent.date}</span>): scale dropped{' '}
          <span className="font-mono font-semibold">{(m.recent.water + m.recent.fat + m.recent.other).toFixed(1)} kg</span>,
          but only ~<span className="font-mono font-semibold">{m.recent.fat.toFixed(2)} kg</span> was fat. ~
          <span className="font-mono font-semibold">{m.recent.water.toFixed(1)} kg</span> was glycogen + water and
          returns on refeed. Don't panic.
        </div>
      )}

      <Card title={`Bodyweight — trend vs scale (daily noise ±${m.noise.toFixed(2)} kg)`}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={m.series}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip content={<ChartTooltip unit="kg" />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="band" name="noise band" stroke="none" fill={C.signal} fillOpacity={0.5} legendType="none" />
            <Scatter dataKey="weight" name="scale" fill={C.scale} />
            <Line type="monotone" dataKey="trend" name="trend" stroke={C.trend} dot={false} strokeWidth={2.5} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Calories in vs expenditure">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={m.series}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip unit="kcal" />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="intake" name="intake">
              {m.series.map((d, i) => (
                <Cell key={i} fill={d.deficitDay ? C.deficit : C.surplus} />
              ))}
            </Bar>
            <Bar dataKey="exercise" name="exercise burn" fill={C.signal} fillOpacity={0.55} />
            <Line type="monotone" dataKey="expenditure" name="expenditure" stroke={C.trend} dot={false} strokeWidth={2} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          On average{' '}
          <span className="font-mono">
            {Math.abs(m.avgDeficit).toLocaleString()} kcal {m.avgDeficit >= 0 ? 'below' : 'above'}
          </span>{' '}
          expenditure per day. Expenditure = baseline TDEE + logged exercise (MET model),
          so active days raise the line.
        </p>
      </Card>

      {m.fastDecomp.length > 0 && (
        <Card title="Fast-loss reality — glycogen/water vs true fat (kg)">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={m.fastDecomp}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip unit="kg" />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="water" name="glycogen + water" stackId="d" fill={C.scale} />
              <Bar dataKey="fat" name="true fat" stackId="d" fill={C.trend} />
              <Bar dataKey="other" name="other" stackId="d" fill={C.surplus} fillOpacity={0.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="True fat lost — cumulative (kg)">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={m.series}>
            <Gradient id="fatGrad" color={C.fat} />
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip unit="kg" />} />
            <Area type="monotone" dataKey="cumFat" name="fat lost" stroke={C.fat} strokeWidth={2.5} fill="url(#fatGrad)" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Cumulative energy balance (kcal)">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={m.series}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<ChartTooltip unit="kcal" />} />
            <ReferenceLine y={0} stroke={C.axis} />
            <Line type="monotone" dataKey="cumBalance" name="net energy" stroke={C.surplus} dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Net ≈ {m.totalNet.toLocaleString()} kcal · est. mass change {projectedMassChangeKg(m.totalNet).toFixed(2)} kg.
        </p>
      </Card>
    </>
  )
}

/** Cross-domain: did strength hold while bodyweight moved? (FastTrack-unique join.) */
function StrengthVsWeight({ rows }: { rows: DailyLogRow[] }) {
  const vp = useFetch(() => getVolumePoints(), [])
  const points = useMemo(() => vp.data ?? [], [vp.data])
  const exercises = useMemo(() => exerciseList(points), [points])
  const [selected, setSelected] = useState('')
  const current = selected || exercises[0] || ''

  const data = useMemo(() => {
    if (!current) return []
    const oneRM = Object.fromEntries(weeklyExerciseSeries(points, current).map((p) => [p.week, p.est1rm]))
    const weighed = rows.filter((r) => r.weight_kg != null)
    const weeks = [...new Set([...Object.keys(oneRM), ...weighed.map((r) => weekStart(r.log_date))])].sort()
    return weeks.map((wk) => {
      const ws = weighed.filter((r) => weekStart(r.log_date) === wk)
      const avgW = ws.length ? ws.reduce((s, r) => s + r.weight_kg!, 0) / ws.length : null
      return {
        week: wk.slice(5),
        est1rm: oneRM[wk] ? +oneRM[wk].toFixed(1) : null,
        weight: avgW == null ? null : +avgW.toFixed(2),
      }
    })
  }, [points, current, rows])

  if (vp.loading || !exercises.length) return null

  return (
    <Card title="Strength vs bodyweight">
      <Select value={current} onChange={(e) => setSelected(e.target.value)} className="mb-4">
        {exercises.map((ex) => (
          <option key={ex} value={ex}>
            {ex}
          </option>
        ))}
      </Select>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="week" {...axisProps} />
          <YAxis yAxisId="rm" {...axisProps} domain={['auto', 'auto']} />
          <YAxis yAxisId="bw" orientation="right" {...axisProps} domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="rm" type="monotone" dataKey="est1rm" name="est. 1RM (kg)" stroke={C.trend} strokeWidth={2.5} dot={false} connectNulls />
          <Line yAxisId="bw" type="monotone" dataKey="weight" name="bodyweight (kg)" stroke={C.fat} strokeWidth={2} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Strength (left) holding or rising while bodyweight (right) falls = you're keeping muscle through a
        cut. Only FastTrack can plot this — your lifting and bodyweight live in one place.
      </p>
    </Card>
  )
}

function DashboardInner() {
  const [range, setRange] = useState(90)
  const logs = useFetch(() => getLogRange(daysAgo(365), today()), [])
  const profile = useFetch(() => getCurrentProfile(), [])

  if (logs.error) return <p className="text-[var(--color-danger)] text-sm">{logs.error}</p>
  if (logs.loading) return <p className="text-[var(--color-muted)]">Loading…</p>

  const allRows = logs.data ?? []
  if (!allRows.length)
    return <p className="text-[var(--color-muted)]">No logs yet — add one on the Log tab.</p>

  const rows = lastNDays(allRows, range, (r) => r.log_date)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <TimeRange value={range} onChange={setRange} />
        <Button variant="ghost" onClick={() => downloadCsv(`fasttrack-${today()}.csv`, logsToCsv(allRows))}>
          Export CSV
        </Button>
      </div>
      <Charts rows={rows} profile={profile.data ?? null} />
      <StrengthVsWeight rows={rows} />
    </div>
  )
}

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <AuthGate>
        <DashboardInner />
      </AuthGate>
    </div>
  )
}
