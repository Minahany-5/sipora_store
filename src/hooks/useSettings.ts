import { useEffect, useState } from 'react'
import { loadSettings } from '../lib/settings'
import type { StoreSettings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSettings()
      .then((s) => {
        if (!cancelled) setSettings(s)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { settings, error }
}
