import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  console.warn('Supabase is not configured yet. Copy .env.example to .env and fill it in (step 2).')
}

// Placeholders keep the app running before Supabase is set up.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'public-anon-key')
