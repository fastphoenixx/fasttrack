import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { getAllLogs } from '../../db/queries'
import { downloadCsv, logsToCsv } from '../data/csv'
import { Button, Card, Stat } from '../../ui/components'
import { CalendarHeatmap, type HeatCell } from '../../ui/CalendarHeatmap'
import { useFetch } from '../../lib/useFetch'
import { today } from '../../lib/dates'
import { weekStreak } from '../../engine'

/** 0–4 completeness: weight + calories + water + fasting logged that day. */
function completeness(r: { weight_kg: number | null; calories_in: number | null; water_ml: number | null; fasting_hours: number | null }): number {
  return [r.weight_kg, r.calories_in, r.water_ml, r.fasting_hours].filter((v) => v != null).length
}

const cell = 'px-3 py-2 text-right font-mono tabular-nums'
const num = (v: number | null, d = 0) => (v == null ? '·' : v.toFixed(d))

function HistoryTable() {
  const { data, error } = useFetch(() => getAllLogs(), [])
  const rows = useMemo(() => data ?? [], [data])

  const stats = useMemo(() => {
    const dates = rows.map((r) => r.log_date)
    const weights = rows.filter((r) => r.weight_kg != null)
    const first = dates[dates.length - 1]
    const streak = weekStreak(dates, today())
    const cells: HeatCell[] = rows.map((r) => ({
      date: r.log_date,
      intensity: completeness(r),
      title: `${r.log_date}: ${completeness(r)}/4 logged`,
    }))
    return {
      count: rows.length,
      streak,
      since: first ?? '—',
      loggedToday: dates.includes(today()),
      latestWeight: weights[0]?.weight_kg ?? null,
      cells,
    }
  }, [rows])

  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Days logged" value={String(stats.count)} />
        <Stat label="Week streak" value={String(stats.streak.current)} unit="wk" tone="var(--color-accent)" />
        <Stat label="Best streak" value={String(stats.streak.best)} unit="wk" />
        <Stat label="Latest weight" value={num(stats.latestWeight, 1)} unit="kg" />
      </div>

      {rows.length > 0 && (
        <Card title="Logging consistency">
          <CalendarHeatmap cells={stats.cells} weeks={26} />
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Each square is a day; darker = more fields logged (weight · calories · water · fasting).
            Tracking since <span className="font-mono">{stats.since}</span>. Week-based streak is
            forgiving — one logged day keeps the week alive.
          </p>
        </Card>
      )}

      {!stats.loggedToday && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-signal)] px-5 py-4">
          <span className="text-sm font-medium">You haven't registered today yet.</span>
          <Link
            to="/log"
            className="rounded-md bg-[var(--color-text)] text-[var(--color-bg)] px-4 py-1.5 text-sm font-medium"
          >
            Register today
          </Link>
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <p className="text-[var(--color-muted)] text-sm">
            No history yet — your daily registrations build up here over time.{' '}
            <Link to="/log" className="text-[var(--color-accent)] underline">
              Add your first entry
            </Link>
            .
          </p>
        </Card>
      ) : (
        <Card title="Historical base">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Weight</th>
                  <th className="px-3 py-2 text-right">kcal</th>
                  <th className="px-3 py-2 text-right">P</th>
                  <th className="px-3 py-2 text-right">C</th>
                  <th className="px-3 py-2 text-right">F</th>
                  <th className="px-3 py-2 text-right">Water</th>
                  <th className="px-3 py-2 text-right">Fast h</th>
                  <th className="px-3 py-2 text-left pl-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)] transition-colors"
                  >
                    <td className="px-3 py-2 font-mono">{r.log_date}</td>
                    <td className={cell}>{num(r.weight_kg, 1)}</td>
                    <td className={cell}>{num(r.calories_in)}</td>
                    <td className={cell}>{num(r.protein_g)}</td>
                    <td className={cell}>{num(r.carb_g)}</td>
                    <td className={cell}>{num(r.fat_g)}</td>
                    <td className={cell}>{num(r.water_ml)}</td>
                    <td className={cell}>{num(r.fasting_hours, 1)}</td>
                    <td className="px-3 py-2 pl-4 text-[var(--color-muted)]">{r.fast_type ?? '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button variant="ghost" onClick={() => downloadCsv(`fasttrack-${today()}.csv`, logsToCsv(rows))}>
              Export CSV
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export function HistoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">History</h1>
      <AuthGate>
        <HistoryTable />
      </AuthGate>
    </div>
  )
}
