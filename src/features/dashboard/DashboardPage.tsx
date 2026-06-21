import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
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
import { cumulativeBalance, estimateExpenditure, projectedMassChangeKg } from '../../engine'
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

function Charts({ rows, profile }: { rows: DailyLogRow[]; profile: ProfileRow | null }) {
  const series = useMemo(() => {
    const energy = rows.map((r) => ({
      intake: r.calories_in ?? 0,
      expenditure: expenditureFor(profile, r.weight_kg),
    }))
    const cum = cumulativeBalance(energy)
    return rows.map((r, i) => ({
      date: r.log_date.slice(5),
      weight: r.weight_kg,
      protein: r.protein_g,
      cumBalance: Math.round(cum[i]),
    }))
  }, [rows, profile])

  const totalNet = series.length ? series[series.length - 1].cumBalance : 0

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Days logged" value={String(rows.length)} />
        <Stat
          label={totalNet <= 0 ? 'Cumulative deficit' : 'Cumulative surplus'}
          value={Math.abs(totalNet).toLocaleString()}
          unit="kcal"
          tone={totalNet <= 0 ? 'var(--color-deficit)' : 'var(--color-surplus)'}
        />
        <Stat
          label="Est. mass change"
          value={projectedMassChangeKg(totalNet).toFixed(2)}
          unit="kg"
        />
      </div>

      <Card title="Cumulative energy balance (kcal)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#6f6a59" fontSize={12} />
            <YAxis stroke="#6f6a59" fontSize={12} />
            <Tooltip contentStyle={{ background: '#f2f0e2', border: '1px solid #d6d1be', color: '#1c1a14' }} />
            <Line type="monotone" dataKey="cumBalance" stroke="#4f7d63" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Bodyweight (kg)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid stroke="#d6d1be" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#6f6a59" fontSize={12} />
            <YAxis stroke="#6f6a59" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip contentStyle={{ background: '#f2f0e2', border: '1px solid #d6d1be', color: '#1c1a14' }} />
            <Line type="monotone" dataKey="weight" stroke="#da6e52" dot={false} strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
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
