import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AuthGate } from '../auth/AuthGate'
import { getCurrentProfile, getLogRange } from '../../db/queries'
import type { DailyLogRow, ProfileRow } from '../../db/types'
import {
  cumulativeBalance,
  dailyFatLossKg,
  decomposeFastLoss,
  estimateExpenditure,
  projectedMassChangeKg,
  weightTrend,
} from '../../engine'
import { today, daysAgo } from '../../lib/dates'
import { logsToCsv, downloadCsv } from '../data/csv'
import { Button, Card, Stat } from '../../ui/components'

/** Estimate a day's expenditure from the profile + that day's logged weight. */
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

const TOOLTIP = { background: '#f2f0e2', border: '1px solid #d6d1be', color: '#1c1a14' }
const FAST_TYPES = new Set(['extended_water', 'dry', 'religious', 'omad'])

function Charts({ rows, profile }: { rows: DailyLogRow[]; profile: ProfileRow | null }) {
  const m = useMemo(() => {
    const energy = rows.map((r) => ({
      intake: r.calories_in ?? 0,
      expenditure: expenditureFor(profile, r.weight_kg),
    }))
    const cum = cumulativeBalance(energy)
    const trend = weightTrend(
      rows.map((r) => ({ date: r.log_date, weight: r.weight_kg })),
      0.25,
    )

    const cumFatArr = energy.reduce<number[]>(
      (acc, e) => [...acc, (acc.at(-1) ?? 0) + dailyFatLossKg(e.intake, e.expenditure)],
      [],
    )
    const series = rows.map((r, i) => {
      const t = trend.series[i].trend
      return {
        date: r.log_date.slice(5),
        weight: r.weight_kg,
        trend: t == null ? null : +t.toFixed(2),
        cumFat: +cumFatArr[i].toFixed(2),
        cumBalance: Math.round(cum[i]),
      }
    })

    const last = energy[energy.length - 1]
    const fatToday = last ? dailyFatLossKg(last.intake, last.expenditure) : 0

    // Most recent fasting day with a drop vs the previous weigh-in → reality check.
    let recentFast: { date: string; observed: number; fatKg: number; waterKg: number } | null = null
    for (let i = rows.length - 1; i > 0 && !recentFast; i--) {
      const r = rows[i]
      if (!r.fast_type || !FAST_TYPES.has(r.fast_type) || r.weight_kg == null) continue
      let prev: number | null = null
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j].weight_kg != null) { prev = rows[j].weight_kg; break }
      }
      if (prev != null && prev > r.weight_kg) {
        const d = decomposeFastLoss(prev - r.weight_kg, r.fasting_hours ?? 24, energy[i].expenditure - energy[i].intake)
        recentFast = { date: r.log_date, observed: d.observedLossKg, fatKg: d.fatLossKg, waterKg: d.glycogenWaterKg }
      }
    }

    return {
      series,
      totalNet: cum.length ? Math.round(cum[cum.length - 1]) : 0,
      fatToday,
      cumFat: cumFatArr.at(-1) ?? 0,
      deviation: trend.lastDeviation,
      noise: trend.residualStd,
      recentFast,
    }
  }, [rows, profile])

  return (
    <>
      {/* Hero row — the honest answer for the anxious daily weigher. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Fat lost today (est.)" value={m.fatToday.toFixed(2)} unit="kg" tone="var(--color-deficit)" />
        <Stat label="True fat lost · period" value={m.cumFat.toFixed(2)} unit="kg" tone="var(--color-deficit)" />
        <Stat
          label="Scale vs trend today"
          value={m.deviation == null ? '—' : `${m.deviation > 0 ? '+' : ''}${m.deviation.toFixed(2)}`}
          unit="kg"
          tone="var(--color-muted)"
        />
        <Stat label="Days logged" value={String(rows.length)} />
      </div>

      <p className="text-xs text-[var(--color-muted)] -mt-2">
        Fat loss is estimated from your energy deficit (≈ deficit ÷ 7700 kcal/kg), not the scale —
        daily weight swings are mostly water &amp; glycogen. An estimate, not a measurement.
      </p>

      {m.recentFast && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-signal)] px-5 py-4 text-sm">
          On <span className="font-mono">{m.recentFast.date}</span> the scale dropped{' '}
          <span className="font-mono font-semibold">{m.recentFast.observed.toFixed(1)} kg</span> — but only ~
          <span className="font-mono font-semibold">{m.recentFast.fatKg.toFixed(2)} kg</span> was fat.
          About <span className="font-mono font-semibold">{m.recentFast.waterKg.toFixed(1)} kg</span> was
          glycogen + water and comes back when you refeed. Don't panic.
        </div>
      )}

      <Card title="True fat lost — cumulative (kg)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={m.series}>
            <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#6f6a59" fontSize={12} />
            <YAxis stroke="#6f6a59" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="cumFat" name="fat lost" stroke="#4f7d63" dot={false} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title={`Bodyweight — trend vs scale (daily noise ±${m.noise.toFixed(2)} kg)`}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={m.series}>
            <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#6f6a59" fontSize={12} />
            <YAxis stroke="#6f6a59" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="weight" name="scale" stroke="#c9c2ad" dot={{ r: 2 }} strokeWidth={1} connectNulls />
            <Line type="monotone" dataKey="trend" name="trend" stroke="#da6e52" dot={false} strokeWidth={2.5} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Cumulative energy balance (kcal)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={m.series}>
            <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#6f6a59" fontSize={12} />
            <YAxis stroke="#6f6a59" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="cumBalance" stroke="#c0863a" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Net energy ≈ {m.totalNet.toLocaleString()} kcal · est. mass change{' '}
          {projectedMassChangeKg(m.totalNet).toFixed(2)} kg over the period.
        </p>
      </Card>
    </>
  )
}

function DashboardInner() {
  const [rows, setRows] = useState<DailyLogRow[]>([])
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getLogRange(daysAgo(90), today()), getCurrentProfile()])
      .then(([logs, p]) => {
        setRows(logs)
        setProfile(p)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (!rows.length)
    return <p className="text-[var(--color-muted)]">No logs yet — add one on the Log tab.</p>

  return (
    <div className="flex flex-col gap-5">
      <Charts rows={rows} profile={profile} />
      <div>
        <Button variant="ghost" onClick={() => downloadCsv(`fasttrack-${today()}.csv`, logsToCsv(rows))}>
          Export CSV
        </Button>
      </div>
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
