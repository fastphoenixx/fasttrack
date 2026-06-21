import type { ReactNode } from 'react'
import { isConfigured } from '../../db/client'
import { Card } from '../../ui/components'

/**
 * Gates DB-backed pages. Single-user PostgREST: access is granted by the bearer
 * token in .env.local, so there's no interactive sign-in. When the token is
 * absent we show a setup notice (the Calculators tab still works without it).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!isConfigured) {
    return (
      <Card title="Backend not connected">
        <p className="text-sm text-[var(--color-muted)]">
          This section reads and writes your FastTrack database (PostgREST on the VPS).
          Add <code>VITE_PGRST_URL</code> and <code>VITE_PGRST_TOKEN</code> to{' '}
          <code>.env.local</code> and restart the dev server. The Calculators tab works
          without any setup.
        </p>
      </Card>
    )
  }
  return <>{children}</>
}
