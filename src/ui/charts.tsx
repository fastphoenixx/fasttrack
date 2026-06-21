// Shared chart components — one editorial look (QuartzFilters). Constants and
// helpers live in chart-theme.ts so this stays Fast-Refresh-clean.
import { RANGES } from './chart-theme'

function fmtNum(v: number): string {
  const r = Math.round(v * 100) / 100
  return Math.abs(r) >= 1000 ? r.toLocaleString() : String(r)
}

interface TipEntry {
  name?: string
  dataKey?: string | number
  value?: number | number[] | null
  color?: string
  stroke?: string
  unit?: string
}

/** Editorial tooltip: mono, tabular, units, no chart-junk. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: TipEntry[]
  label?: string | number
  unit?: string
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null && !Array.isArray(p.value))
  if (!rows.length) return null
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs">
      {label != null && (
        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-1">{label}</div>
      )}
      {rows.map((p, i) => (
        <div key={p.dataKey ?? i} className="flex items-center gap-2 font-mono tabular-nums">
          <span style={{ color: p.color ?? p.stroke }}>●</span>
          <span className="text-[var(--color-muted)]">{p.name ?? p.dataKey}</span>
          <span className="ml-auto">
            {fmtNum(p.value as number)}
            {(p.unit ?? unit) ? ` ${p.unit ?? unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Vertical gradient fill (signal-to-transparent) for area charts. */
export function Gradient({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
        <stop offset="100%" stopColor={color} stopOpacity={0.02} />
      </linearGradient>
    </defs>
  )
}

/** Time-range chips reused on every time-series chart. days=0 means all. */
export function TimeRange({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--color-border)] overflow-hidden text-xs font-mono">
      {RANGES.map((r) => (
        <button
          key={r.label}
          type="button"
          onClick={() => onChange(r.days)}
          className={`px-2.5 py-1 transition-colors ${
            value === r.days
              ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
              : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
