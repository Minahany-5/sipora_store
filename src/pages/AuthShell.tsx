import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** The frame for login, sign up and password pages. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <>
      <Link to="/" className="font-display text-3xl font-bold" aria-label="Sipora home">
        sipora.
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-plum/70">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </>
  )
}

/** "Continue with Google" is shown only when VITE_ENABLE_GOOGLE=true */
export const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE === 'true'
