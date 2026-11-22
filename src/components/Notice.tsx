import type { ReactNode } from 'react'

type Tone = 'error' | 'success' | 'info'

const TONES: Record<Tone, string> = {
  error: 'bg-rose',
  success: 'bg-mint',
  info: 'bg-lavender',
}

/** A colored message box. */
export default function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </div>
  )
}
