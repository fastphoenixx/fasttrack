import { useState } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { Button, Card, Stat } from '../../ui/components'
import type { ParsedWorkout } from '../../engine/import/hevy'
import { importWorkouts, parseHevyCsv, type ImportSummary } from './importWorkouts'

function Importer() {
  const [parsed, setParsed] = useState<ParsedWorkout[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = parsed
    ? {
        workouts: parsed.length,
        sets: parsed.reduce((n, w) => n + w.sets.length, 0),
        from: parsed[0]?.logDate ?? '—',
        to: parsed[parsed.length - 1]?.logDate ?? '—',
      }
    : null

  async function onFile(file: File) {
    setError(null)
    setSummary(null)
    setFileName(file.name)
    try {
      setParsed(parseHevyCsv(await file.text()))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function runImport() {
    if (!parsed) return
    setBusy(true)
    setError(null)
    try {
      setSummary(await importWorkouts(parsed))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Import Hevy workout CSV">
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Export your data from Hevy (Settings → Export &amp; Backup) and drop the CSV here.
          Re-importing is safe — already-imported workouts are skipped.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:text-[var(--color-bg)] file:px-4 file:py-1.5 file:font-medium"
        />
        {fileName && <p className="mt-2 font-mono text-xs text-[var(--color-muted)]">{fileName}</p>}
      </Card>

      {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

      {preview && !summary && (
        <Card title="Preview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Workouts" value={String(preview.workouts)} />
            <Stat label="Sets" value={String(preview.sets)} />
            <Stat label="From" value={preview.from} />
            <Stat label="To" value={preview.to} />
          </div>
          <div className="mt-5">
            <Button onClick={runImport} disabled={busy}>
              {busy ? 'Importing…' : `Import ${preview.workouts} workouts`}
            </Button>
          </div>
        </Card>
      )}

      {summary && (
        <Card title="Import complete">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="New workouts" value={String(summary.newWorkouts)} tone="var(--color-deficit)" />
            <Stat label="Sets added" value={String(summary.insertedSets)} tone="var(--color-deficit)" />
            <Stat label="Skipped (dupes)" value={String(summary.skipped)} />
            <Stat label="Parsed total" value={String(summary.parsedWorkouts)} />
          </div>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Head to the <span className="text-[var(--color-accent)]">Training</span> tab to see
            volume per muscle group and per exercise over time.
          </p>
        </Card>
      )}
    </div>
  )
}

export function ImportPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Import</h1>
      <AuthGate>
        <Importer />
      </AuthGate>
    </div>
  )
}
