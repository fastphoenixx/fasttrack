// Chart constants & helpers (no components — keeps charts.tsx Fast-Refresh-clean).
// QuartzFilters palette kept in sync with the @theme tokens in index.css.

export const C = {
  grid: '#d6d1be',
  axis: '#6f6a59',
  ink: '#1c1a14',
  surface: '#f2f0e2',
  fat: '#4f7d63',
  trend: '#da6e52',
  scale: '#c9c2ad',
  surplus: '#c0863a',
  deficit: '#4f7d63',
  signal: '#fbc6b6',
  protein: '#6e62a6',
  danger: '#b4452f',
} as const

export const axisProps = {
  stroke: C.axis,
  fontSize: 13,
  tickLine: false,
  axisLine: { stroke: C.grid },
} as const

export const gridProps = { stroke: C.grid, strokeDasharray: '3 3', vertical: false } as const

export const RANGES = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 0 },
] as const

/** Keep the last `days` of a date-sorted list (days=0 → all). */
export function lastNDays<T>(rows: T[], days: number, getDate: (r: T) => string): T[] {
  if (days <= 0 || !rows.length) return rows
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  return rows.filter((r) => getDate(r) >= cutoff)
}
