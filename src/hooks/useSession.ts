import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** The logged-in user (or null). Login screens come in Step 5. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession(data.session)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  return { session, ready }
}
