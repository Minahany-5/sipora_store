import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Field from '../components/Field'
import GlassButton from '../components/GlassButton'
import Notice from '../components/Notice'
import { isEgyptianMobile, isEmail } from '../lib/validate'
import AuthShell, { googleEnabled } from './AuthShell'

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'password', string>>

export default function Signup() {
  const { user, ready, signUp, signInWithGoogle } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Errors>({})
  const [confirmEmail, setConfirmEmail] = useState(false)

  if (ready && user) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errors: Errors = {}
    if (name.trim().length < 2) errors.name = 'Please write your name.'
    if (!isEmail(email)) errors.email = 'Please write a correct email.'
    if (phone.trim() && !isEgyptianMobile(phone)) errors.phone = 'Please write an Egyptian mobile number, like 01012345678.'
    if (password.length < 8) errors.password = 'Use at least 8 letters or numbers.'
    setFieldErrors(errors)
    setError(null)
    if (Object.keys(errors).length) return

    setBusy(true)
    try {
      const { needsConfirmation } = await signUp({ fullName: name, email, password, phone: phone.trim() || undefined })
      if (needsConfirmation) setConfirmEmail(true)
      // If no confirmation is needed, the person is logged in and the page above sends them on.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (confirmEmail) {
    return (
      <AuthShell title="Check your email">
        <Notice tone="success">
          We sent a message to <b>{email}</b>. Open it and tap the link to finish. Then log in.
        </Notice>
        <div className="mt-4">
          <Link to="/login" className="text-sm font-semibold underline">
            Go to log in
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="Order 3 times and get a reward.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <Field label="Mobile (optional)" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} placeholder="01012345678" />
        <Field label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} hint="At least 8 letters or numbers." />
        <GlassButton type="submit" variant="plum" size="lg" full disabled={busy}>
          {busy ? 'Creating...' : 'Create account'}
        </GlassButton>
      </form>

      {googleEnabled && (
        <div className="mt-3">
          <GlassButton
            full
            onClick={() => {
              setError(null)
              signInWithGoogle().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
            }}
          >
            Continue with Google
          </GlassButton>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-plum/70">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-plum underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  )
}
