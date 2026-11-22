import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { LoyaltyInfo } from '../types'
import { useSession } from './useSession'

/** Reads "Order 1 of 3" from the database. Returns null when nobody is logged in. */
export function useLoyalty(): LoyaltyInfo | null {
  const { session } = useSession()
  const userId = session?.user.id ?? null
  const [info, setInfo] = useState<LoyaltyInfo | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase.rpc('my_loyalty').then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data) || data.length === 0) return
      setInfo(data[0] as LoyaltyInfo)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return userId ? info : null
}
