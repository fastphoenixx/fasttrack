import { useEffect, useState } from 'react'

export interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Standard data-fetching hook: runs queryFn, tracks loading/error, and exposes
 * refetch(). A stale-guard prevents setState after unmount or when deps change
 * mid-flight. One place to add caching/auth later — deliberately tiny (no
 * TanStack Query) for a single-user app.
 */
export function useFetch<T>(queryFn: () => Promise<T>, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    // Intentional reset of request state when deps/refetch change.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    queryFn()
      .then((d) => active && setData(d))
      .catch((e) => active && setError((e as Error).message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, refetch: () => setTick((t) => t + 1) }
}
