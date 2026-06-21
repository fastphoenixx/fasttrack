import type { DailyLogRow } from '../../db/types'

const COLUMNS: (keyof DailyLogRow)[] = [
  'log_date',
  'calories_in',
  'protein_g',
  'carb_g',
  'fat_g',
  'water_ml',
  'weight_kg',
  'fasting_hours',
  'fast_type',
  'notes',
]

function escape(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Serialize daily logs to a CSV string (flat columns; jsonb fields omitted). */
export function logsToCsv(rows: DailyLogRow[]): string {
  const header = COLUMNS.join(',')
  const lines = rows.map((r) => COLUMNS.map((c) => escape(r[c])).join(','))
  return [header, ...lines].join('\n')
}

/** Trigger a browser download of the given CSV content. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
