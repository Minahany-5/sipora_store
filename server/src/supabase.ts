import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config } from './config.js'

/** The "admin" database connection. It skips RLS, so it must stay on the server. */
export function createAdminClient(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
