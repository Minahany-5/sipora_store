import { useEffect, useState } from 'react'
import { loadSettings } from '../lib/settings'
import type { StoreSettings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSettings()
      .then((s) => {
        if (!cancelled) setSettings(s)
      })
      .catch(() => {
        /* the page shows "..." until the settings arrive */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return settings
}
