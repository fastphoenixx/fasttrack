// GitHub-style calendar heatmap (custom grid — recharts has no calendar).
// Columns = weeks (Mon-anchored), rows = Mon..Sun. Cream→peach intensity ramp.

export interface HeatCell {
  date: string // YYYY-MM-DD
  intensity: number // 0..4
  title?: string // hover text
}

const RAMP = [
  '#e7e3d2', // 0 — empty (paper, slightly darker than bg)
  '#f3d9bf', // 1
  '#fbc6b6', // 2 — signal peach
  '#ec9b82', // 3
  '#da6e52', // 4 — accent
]

function mondayUTC(d: Date): Date {
  const x = new Date(d)
  const day = x.getUTCDay()
  x.setUTCDate(x.getUTCDate() - ((day + 6) % 7))
  x.setUTCHours(0, 0, 0, 0)
  return x
}

/**
 * Renders `weeks` columns ending at `endDate` (default the cells' latest date).
 * Pass a value→intensity-bucketed cell list keyed by date.
 */
export function CalendarHeatmap({ cells, weeks = 26 }: { cells: HeatCell[]; weeks?: number }) {
  const byDate = new Map(cells.map((c) => [c.date, c]))
  const latest = cells.reduce((m, c) => (c.date > m ? c.date : m), cells[0]?.date ?? '2026-01-01')
  const end = mondayUTC(new Date(`${latest}T00:00:00Z`))
  const start = new Date(end.getTime() - (weeks - 1) * 7 * 86_400_000)

  const cols = Array.from({ length: weeks }, (_, w) => {
    const colStart = new Date(start.getTime() + w * 7 * 86_400_000)
    return Array.from({ length: 7 }, (_, d) => {
      const day = new Date(colStart.getTime() + d * 86_400_000)
      const key = day.toISOString().slice(0, 10)
      const cell = byDate.get(key)
      return { key, intensity: cell?.intensity ?? 0, title: cell?.title ?? `${key}: no log` }
    })
  })

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((c) => (
            <div
              key={c.key}
              title={c.title}
              className="h-3 w-3 rounded-[2px]"
              style={{ backgroundColor: RAMP[Math.max(0, Math.min(4, c.intensity))] }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
