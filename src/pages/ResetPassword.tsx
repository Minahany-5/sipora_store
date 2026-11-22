import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Field from '../components/Field'
import GlassButton from '../components/GlassButton'
import Notice from '../components/Notice'
import Skeleton from '../components/Skeleton'
import AuthShell from './AuthShell'

/** The link in the reset email opens this page. Supabase logs the person in for a moment, so they can set a new password. */
export default function ResetPassword() {
  const { user, ready, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ready) return <Skeleton className="h-64" />

  if (!user) {
    return (
      <AuthShell title="This link is not valid">
        <Notice tone="error">The link is old or already used. Please ask for a new one.</Notice>
        <p className="mt-4 text-sm">
          <Link to="/forgot-password" className="font-semibold underline">
            Send me a new link
          </Link>
        </p>
      </AuthShell>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use at least 8 letters or numbers.')
    if (password !== again) return setError('The two passwords are not the same.')
    setBusy(true)
    try {
      await updatePassword(password)
      navigate('/account', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 letters or numbers." />
        <Field label="Write it again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        <GlassButton type="submit" variant="plum" size="lg" full disabled={busy}>
          {busy ? 'Saving...' : 'Save the new password'}
        </GlassButton>
      </form>
    </AuthShell>
  )
}
