import { PostgrestClient } from '@supabase/postgrest-js'

const url = import.meta.env.VITE_PGRST_URL
const token = import.meta.env.VITE_PGRST_TOKEN

/** True once the PostgREST endpoint + token are configured. */
export const isConfigured = Boolean(url && token)

if (!isConfigured) {
  console.warn(
    '[FastTrack] PostgREST not configured. Set VITE_PGRST_URL and VITE_PGRST_TOKEN in .env.local',
  )
}

/**
 * PostgREST data client. Single-user: a long-lived bearer token (role
 * `fasttrack_user`) authorizes every request. Keep the deployed site behind
 * Cloudflare Access so the bundle (and token) isn't publicly fetchable.
 */
export const db = new PostgrestClient(url ?? 'http://localhost:3001', {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})
