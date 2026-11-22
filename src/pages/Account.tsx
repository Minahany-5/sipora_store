import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Field, { TextAreaField } from '../components/Field'
import GlassButton from '../components/GlassButton'
import LoyaltyCard from '../components/LoyaltyCard'
import Notice from '../components/Notice'
import Skeleton from '../components/Skeleton'
import { useLoyalty } from '../hooks/useLoyalty'
import { useSettings } from '../hooks/useSettings'
import { addAddress, deleteAddress, fetchAddresses } from '../lib/addresses'
import { isEgyptianMobile } from '../lib/validate'
import type { Address } from '../types'

export default function Account() {
  const navigate = useNavigate()
  const { user, ready, isStaff, profile, signOut } = useAuth()
  const { settings } = useSettings()
  const loyalty = useLoyalty()
  const whatsapp = settings ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}` : null

  if (!ready) return <Skeleton className="h-64" />

  // ----- Not logged in -----
  if (!user) {
    return (
      <>
        <h1 className="font-display text-3xl font-bold">Account</h1>
        <section className="mt-4 rounded-[1.75rem] bg-lavender p-5">
          <p className="font-display text-xl font-bold">Welcome to Sipora</p>
          <p className="mt-1 text-sm text-plum/70">Log in to see your orders, addresses, and rewards.</p>
          <div className="mt-4 flex gap-3">
            <GlassButton variant="plum" onClick={() => navigate('/login')}>
              Log in
            </GlassButton>
            <GlassButton onClick={() => navigate('/signup')}>Sign up</GlassButton>
          </div>
        </section>
        {settings && <LoyaltyCard settings={settings} loyalty={null} />}
        {whatsapp && (
          <div className="mt-4">
            <GlassButton variant="mint" full onClick={() => window.open(whatsapp, '_blank', 'noopener')}>
              WhatsApp us
            </GlassButton>
          </div>
        )}
      </>
    )
  }

  // ----- Logged in -----
  const firstName = (profile?.full_name ?? '').trim().split(' ')[0]

  return (
    <>
      <h1 className="font-display text-3xl font-bold">{firstName ? `Hi, ${firstName}` : 'Account'}</h1>
      <p className="text-sm text-plum/60">{user.email}</p>
      {isStaff && (
        <div className="mt-3">
          <Notice tone="info">
            You are signed in as <b>{profile?.role}</b>. The admin dashboard comes in the next step.
          </Notice>
        </div>
      )}

      {settings && <LoyaltyCard settings={settings} loyalty={loyalty} />}

      <div className="mt-4 space-y-3">
        <GlassButton full onClick={() => navigate('/orders')}>
          My orders
        </GlassButton>
      </div>

      <AddressesSection userId={user.id} />
      <ProfileSection />

      <div className="mt-6 space-y-3">
        {whatsapp && (
          <GlassButton variant="mint" full onClick={() => window.open(whatsapp, '_blank', 'noopener')}>
            WhatsApp us
          </GlassButton>
        )}
        <GlassButton
          variant="rose"
          full
          onClick={async () => {
            await signOut()
            navigate('/', { replace: true })
          }}
        >
          Log out
        </GlassButton>
      </div>
    </>
  )
}

function ProfileSection() {
  const { profile, updateProfile } = useAuth()
  const [name, setName] = useState<string | undefined>(undefined)
  const [phone, setPhone] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  // Show what is saved until the person types.
  const nameValue = name ?? profile?.full_name ?? ''
  const phoneValue = phone ?? profile?.phone ?? ''

  async function save(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (nameValue.trim().length < 2) return setMsg({ tone: 'error', text: 'Please write your name.' })
    if (phoneValue.trim() && !isEgyptianMobile(phoneValue)) return setMsg({ tone: 'error', text: 'Please write an Egyptian mobile number, like 01012345678.' })
    setBusy(true)
    try {
      await updateProfile({ full_name: nameValue.trim(), phone: phoneValue.trim() || null })
      setMsg({ tone: 'success', text: 'Saved.' })
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold">My details</h2>
      <form onSubmit={save} noValidate className="mt-3 space-y-3">
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Field label="Full name" autoComplete="name" value={nameValue} onChange={(e) => setName(e.target.value)} />
        <Field label="Mobile" type="tel" autoComplete="tel" inputMode="tel" value={phoneValue} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" />
        <GlassButton type="submit" size="sm" disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </GlassButton>
      </form>
    </section>
  )
}

function AddressesSection({ userId }: { userId: string }) {
  const [list, setList] = useState<Address[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('Home')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAddresses(userId)
      .then((rows) => {
        if (!cancelled) setList(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.')
      })
    return () => {
      cancelled = true
    }
  }, [userId, reload])

  async function add(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (text.trim().length < 10) return setError('Please write the full address (at least 10 letters).')
    setBusy(true)
    try {
      await addAddress(userId, { label, full_address: text })
      setAdding(false)
      setText('')
      setLabel('Home')
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this address?')) return
    setError(null)
    try {
      await deleteAddress(id)
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold">Addresses</h2>
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {list === null && !error && <Skeleton className="mt-3 h-16" />}
      {list && list.length === 0 && !adding && <p className="mt-2 text-sm text-plum/60">No saved addresses yet.</p>}
      <ul className="mt-3 space-y-2">
        {list?.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/60 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{a.label}</p>
              <p className="text-sm text-plum/70">{a.full_address}</p>
            </div>
            <button type="button" onClick={() => remove(a.id)} aria-label={`Delete ${a.label}`} className="p-1 text-plum/50 hover:text-plum">
              ✕
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} noValidate className="mt-3 space-y-3">
          <Field label="Name of the place" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work..." />
          <TextAreaField label="Full address" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Street, building, floor, area, Cairo" />
          <div className="flex gap-2">
            <GlassButton type="submit" size="sm" variant="plum" disabled={busy}>
              {busy ? 'Saving...' : 'Save address'}
            </GlassButton>
            <GlassButton size="sm" onClick={() => setAdding(false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <GlassButton size="sm" onClick={() => setAdding(true)}>
            Add an address
          </GlassButton>
        </div>
      )}
    </section>
  )
}
