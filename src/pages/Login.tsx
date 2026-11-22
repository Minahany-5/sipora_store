import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import GlassButton from '../components/GlassButton'
import Field from '../components/Field'
import Notice from '../components/Notice'
import { isEmail } from '../lib/validate'
import AuthShell, { googleEnabled } from './AuthShell'

export default function Login() {
  const { user, ready, signIn, signInWithGoogle } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  if (ready && user) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errors: { email?: string; password?: string } = {}
    if (!isEmail(email)) errors.email = 'Please write a correct email.'
    if (!password) errors.password = 'Please write your password.'
    setFieldErrors(errors)
    setError(null)
    if (Object.keys(errors).length) return

    setBusy(true)
    try {
      await signIn(email, password) // after this, the page above sends you to "from"
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your orders and your rewards.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
        <div className="text-end">
          <Link to="/forgot-password" className="text-xs font-semibold underline">
            Forgot your password?
          </Link>
        </div>
        <GlassButton type="submit" variant="plum" size="lg" full disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </GlassButton>
      </form>

      {googleEnabled && (
        <div className="mt-3">
          <GlassButton full onClick={handleGoogle}>
            Continue with Google
          </GlassButton>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-plum/70">
        New here?{' '}
        <Link to="/signup" state={location.state} className="font-semibold text-plum underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
