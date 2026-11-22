import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Field from '../components/Field'
import GlassButton from '../components/GlassButton'
import Notice from '../components/Notice'
import { isEmail } from '../lib/validate'
import AuthShell from './AuthShell'

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isEmail(email)) {
      setError('Please write a correct email.')
      return
    }
    setBusy(true)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Write your email. We will send you a link.">
      {sent ? (
        // The same message is shown if the email has no account. This keeps accounts private.
        <Notice tone="success">If this email has an account, we sent a link to it. Please check your inbox.</Notice>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <GlassButton type="submit" variant="plum" size="lg" full disabled={busy}>
            {busy ? 'Sending...' : 'Send the link'}
          </GlassButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  )
}
