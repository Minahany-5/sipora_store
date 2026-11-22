import { createClient } from '@supabase/supabase-js'

const rawUrl = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim().replace(/\/+$/, '')
const rawKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim()

/** Reads the "role" inside an old-style (JWT) Supabase key. */
function keyRole(key: string): string | null {
  try {
    const payload = key.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

/** A short, simple sentence that says what is wrong with .env (or null when it is fine). */
function findConfigProblem(): string | null {
  if (!rawUrl) return 'VITE_SUPABASE_URL is empty. Paste your Project URL in the .env file.'
  if (!/^https?:\/\//.test(rawUrl)) return 'VITE_SUPABASE_URL must start with https:// (example: https://abcd.supabase.co).'
  if (rawUrl.includes('YOUR-PROJECT')) return 'VITE_SUPABASE_URL still has the example text. Paste your real Project URL.'
  if (rawUrl.includes('/rest/v1')) return 'VITE_SUPABASE_URL must be only the Project URL, without /rest/v1.'
  if (!rawKey) return 'VITE_SUPABASE_ANON_KEY is empty. Paste your anon (publishable) key in the .env file.'
  if (rawKey.includes('YOUR-ANON')) return 'VITE_SUPABASE_ANON_KEY still has the example text. Paste your real anon key.'
  if (rawKey.startsWith('sb_secret_') || keyRole(rawKey) === 'service_role') {
    return 'This is a SECRET key. Never use it in the website. Use the anon (publishable) key.'
  }
  return null
}

/** null = .env is fine. Pages show this text when something is wrong. */
export const supabaseConfigError = findConfigProblem()

if (supabaseConfigError) console.warn(`[Sipora] ${supabaseConfigError}`)

// If .env is wrong we use placeholders, so the site still opens and shows a clear message
// (and a secret key is never sent from the browser).
export const supabase = supabaseConfigError
  ? createClient('http://localhost:54321', 'public-anon-key')
  : createClient(rawUrl, rawKey)
