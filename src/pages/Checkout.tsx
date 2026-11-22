import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useCart } from '../cart/useCart'
import Field, { TextAreaField } from '../components/Field'
import GlassButton from '../components/GlassButton'
import Notice from '../components/Notice'
import ProofFields from '../components/ProofFields'
import Skeleton from '../components/Skeleton'
import { useCartTotals } from '../hooks/useCartTotals'
import { ApiError, api } from '../lib/api'
import { addAddress, fetchAddresses } from '../lib/addresses'
import { formatEGP } from '../lib/format'
import { uploadScreenshot, validateScreenshot } from '../lib/storage'
import { isEgyptianMobile, isValidReference } from '../lib/validate'
import type { Address, PlacedOrder } from '../types'

type Method = 'cod' | 'instapay'
type Errors = Partial<Record<'name' | 'phone' | 'address' | 'method' | 'reference' | 'file', string>>

/** A chat-style question from Sipora. */
function Bubble({ children }: { children: ReactNode }) {
  return <div className="max-w-[88%] rounded-3xl rounded-bl-md bg-white/70 px-4 py-3 text-sm font-medium shadow-sm">{children}</div>
}

export default function Checkout() {
  const navigate = useNavigate()
  const { user, profile, ready } = useAuth()
  const cart = useCart()
  const totals = useCartTotals()

  // What the person typed. "undefined" = not typed yet, so we show the saved profile value.
  const [name, setName] = useState<string | undefined>(undefined)
  const [phone, setPhone] = useState<string | undefined>(undefined)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [saveAddress, setSaveAddress] = useState(false)
  const [method, setMethod] = useState<Method | null>(null)
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saved, setSaved] = useState<Address[]>([])
  const [copied, setCopied] = useState(false)

  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)

  /** The red message of a field goes away when the person starts to fix it. */
  const clearError = (...keys: (keyof Errors)[]) =>
    setErrors((prev) => {
      if (keys.every((k) => prev[k] === undefined)) return prev
      const next = { ...prev }
      for (const k of keys) delete next[k]
      return next
    })

  const userId = user?.id ?? null
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchAddresses(userId)
      .then((rows) => {
        if (!cancelled) setSaved(rows)
      })
      .catch(() => {
        /* saved addresses are only a help; typing an address still works */
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!ready) return <Skeleton className="h-64" />
  if (!user) return <Navigate to="/login" state={{ from: '/checkout' }} replace />

  // ----- After the order is placed -----
  if (placed) {
    return (
      <>
        <section className="rounded-[2rem] bg-mint p-6 text-center">
          <p className="text-4xl" aria-hidden="true">
            🎉
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">Thank you!</h1>
          <p className="mt-1 text-sm">
            Your order <b>#{placed.orderNumber}</b> is placed.
          </p>
          <p className="mt-3 font-display text-2xl font-bold">{formatEGP(placed.total)}</p>
          {placed.loyaltyApplied && <p className="mt-1 text-sm font-semibold">Your loyalty discount was applied: − {formatEGP(placed.discount)}</p>}
          <p className="mt-3 text-sm text-plum/80">
            {method === 'cod' ? 'Please pay in cash when your order arrives.' : 'We will check your Instapay payment and tell you very soon.'}
          </p>
        </section>
        <div className="mt-4 space-y-3">
          <GlassButton variant="plum" size="lg" full onClick={() => navigate('/orders')}>
            See my orders
          </GlassButton>
          <GlassButton full onClick={() => navigate('/discover')}>
            Keep shopping
          </GlassButton>
        </div>
      </>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <div className="pt-8 text-center">
        <h1 className="font-display text-2xl font-bold">Your bag is empty</h1>
        <div className="mt-4">
          <GlassButton variant="plum" onClick={() => navigate('/discover')}>
            Go to Discover
          </GlassButton>
        </div>
      </div>
    )
  }

  const nameValue = name ?? profile?.full_name ?? ''
  const phoneValue = phone ?? profile?.phone ?? ''
  const firstName = nameValue.trim().split(' ')[0]
  const instapayHandle = totals.settings?.instapay_handle ?? null

  function validate(): Errors {
    const e: Errors = {}
    if (nameValue.trim().length < 2) e.name = 'Please write your name.'
    if (!isEgyptianMobile(phoneValue)) e.phone = 'Please write an Egyptian mobile number, like 01012345678.'
    if (address.trim().length < 10) e.address = 'Please write the full address (at least 10 letters).'
    if (!method) e.method = 'Please choose how you will pay.'
    if (method === 'instapay') {
      if (!reference.trim() && !file) e.reference = 'Add your reference number or a screenshot.'
      else if (reference.trim() && !isValidReference(reference)) e.reference = 'Use only letters, numbers, - and _ (4 to 40).'
      if (file) {
        const problem = validateScreenshot(file)
        if (problem) e.file = problem
      }
    }
    return e
  }

  async function placeOrder(ev: FormEvent) {
    ev.preventDefault()
    setServerError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0 || !method || !user) return

    setBusy(true)
    try {
      const screenshotPath = method === 'instapay' && file ? await uploadScreenshot(user.id, file) : undefined
      // NOTE: we send NO prices. The server reads the real prices from the database.
      const res = await api<{ order: PlacedOrder }>('/api/orders', {
        method: 'POST',
        body: {
          items: cart.lines.map((l) => ({ productId: l.productId, sizeId: l.sizeId, quantity: l.quantity })),
          paymentMethod: method,
          customer: { name: nameValue.trim(), phone: phoneValue.trim() },
          address: { text: address.trim() },
          notes: notes.trim() || undefined,
          instapayReference: method === 'instapay' && reference.trim() ? reference.trim() : undefined,
          screenshotPath,
        },
      })

      if (saveAddress && !saved.some((a) => a.full_address === address.trim())) {
        await addAddress(user.id, { label: 'Home', full_address: address, phone: phoneValue.trim() }).catch(() => {})
      }
      cart.clear()
      setPlaced(res.order)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { from: '/checkout' } })
        return
      }
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function copyNumber() {
    if (!instapayHandle) return
    try {
      await navigator.clipboard.writeText(instapayHandle)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* the person can copy by hand */
    }
  }

  return (
    <form onSubmit={placeOrder} noValidate>
      <div className="flex items-center gap-3">
        <GlassButton size="icon" aria-label="Back to the bag" onClick={() => navigate('/cart')}>
          ‹
        </GlassButton>
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
      </div>

      {/* ---- Step 1: Delivery ---- */}
      <div className="mt-5">
        <Bubble>{firstName ? `Hi ${firstName}! ` : ''}Where should we deliver?</Bubble>
      </div>
      <section className="ms-6 mt-3 space-y-3 rounded-[1.75rem] bg-mint p-4">
        <Field label="Your name" autoComplete="name" value={nameValue} onChange={(e) => { setName(e.target.value); clearError('name') }} error={errors.name} />
        <Field label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" value={phoneValue} onChange={(e) => { setPhone(e.target.value); clearError('phone') }} placeholder="01012345678" error={errors.phone} />

        {saved.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-plum/70">My saved addresses</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {saved.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setAddress(a.full_address); clearError('address') }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${address === a.full_address ? 'bg-plum text-white' : 'bg-white/70'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <TextAreaField label="Full address" rows={3} value={address} onChange={(e) => { setAddress(e.target.value); clearError('address') }} placeholder="Street, building, floor, flat, area, Cairo" error={errors.address} />
        <Field label="Note for the delivery (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Call me first..." />
        {!saved.some((a) => a.full_address === address.trim()) && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-[#4a1f28]" />
            Save this address for next time
          </label>
        )}
      </section>

      {/* ---- Step 2: Payment ---- */}
      <div className="mt-5">
        <Bubble>How would you like to pay?</Bubble>
      </div>
      <section className="ms-6 mt-3 space-y-3 rounded-[1.75rem] bg-lavender p-4">
        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2">
          {(
            [
              ['instapay', 'Instapay'],
              ['cod', 'Cash on delivery'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={method === id}
              onClick={() => { setMethod(id); clearError('method', 'reference', 'file') }}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${method === id ? 'bg-plum text-white' : 'bg-white/70'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.method && <p className="ps-2 text-xs font-medium text-[#a3283f]">{errors.method}</p>}

        {method === 'instapay' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white/60 p-3 text-sm">
              <p>
                1. Send <b>{totals.total === null ? '...' : formatEGP(totals.total)}</b> with Instapay to:
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-full bg-white px-4 py-2">
                <span className="font-semibold tabular-nums">{instapayHandle ?? '...'}</span>
                {instapayHandle && (
                  <button type="button" onClick={copyNumber} className="text-xs font-semibold underline">
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                )}
              </div>
              <p className="mt-2">2. Then add your reference number or a screenshot:</p>
            </div>
            <ProofFields reference={reference} onReference={(v) => { setReference(v); clearError('reference') }} file={file} onFile={(f) => { setFile(f); clearError('reference', 'file') }} referenceError={errors.reference} fileError={errors.file} disabled={busy} />
          </div>
        )}
        {method === 'cod' && <p className="text-sm text-plum/80">You pay in cash when your order arrives.</p>}
      </section>

      {/* ---- Step 3: Summary ---- */}
      <section className="mt-5 rounded-[1.75rem] bg-white/60 p-4">
        <ul className="space-y-1 text-sm">
          {cart.lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {l.quantity} × {l.name}
                {l.sizeLabel ? ` · ${l.sizeLabel}` : ''}
              </span>
              <span className="shrink-0">{formatEGP(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-plum/15 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatEGP(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && totals.settings && (
            <div className="flex justify-between text-aqua">
              <dt>Loyalty discount ({totals.settings.loyalty_discount_percent}%)</dt>
              <dd>− {formatEGP(totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{totals.delivery === null ? '...' : formatEGP(totals.delivery)}</dd>
          </div>
          <div className="flex justify-between pt-1 font-display text-xl font-bold">
            <dt>Total</dt>
            <dd>{totals.total === null ? '...' : formatEGP(totals.total)}</dd>
          </div>
        </dl>
        <p className="mt-1 text-xs text-plum/50">The final price is checked again when you place the order.</p>
      </section>

      {serverError && (
        <div className="mt-4">
          <Notice tone="error">
            {serverError}{' '}
            {serverError.toLowerCase().includes('stock') || serverError.toLowerCase().includes('available') ? (
              <Link to="/cart" className="font-semibold underline">
                Go to the bag
              </Link>
            ) : null}
          </Notice>
        </div>
      )}
      {Object.keys(errors).length > 0 && !serverError && (
        <div className="mt-4">
          <Notice tone="error">Please check the red messages above.</Notice>
        </div>
      )}

      <div className="mt-5">
        <GlassButton type="submit" variant="plum" size="lg" full disabled={busy}>
          {busy ? 'Placing your order...' : totals.total === null ? 'Place order' : `Place order · ${formatEGP(totals.total)}`}
        </GlassButton>
      </div>
    </form>
  )
}
