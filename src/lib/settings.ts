import { supabase } from './supabase'
import type { StoreSettings } from '../types'

let cache: Promise<StoreSettings> | null = null

/** Delivery fee, loyalty rules, WhatsApp number. One row in "store_settings". */
export function loadSettings(): Promise<StoreSettings> {
  if (!cache) {
    cache = (async () => {
      const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single()
      if (error) throw new Error(error.message)
      return data as unknown as StoreSettings
    })().catch((err: unknown) => {
      cache = null
      throw err
    })
  }
  return cache
}
