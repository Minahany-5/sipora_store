import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { ApiError, api } from '../lib/api'
import { uploadScreenshot } from '../lib/storage'
import { isValidReference } from '../lib/validate'
import type { OrderRow } from '../types'
import GlassButton from './GlassButton'
import Notice from './Notice'
import ProofFields from './ProofFields'

/** Buttons under an order: cancel (while waiting) and send an Instapay proof. */
export default function OrderActions({ order, onChanged }: { order: OrderRow; onChanged: () => void }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const waiting = order.status === 'pending'
  const canSendProof = waiting && order.payment_method === 'instapay' && !order.payments.some((p) => p.status === 'approved')
  if (!waiting) return null

  async function cancel() {
    if (!window.confirm('Cancel this order?')) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/orders/${order.id}/cancel`, { method: 'POST' })
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function sendProof(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!reference.trim() && !file) return setError('Add your reference number or a screenshot.')
    if (reference.trim() && !isValidReference(reference)) return setError('The reference can have only letters, numbers, - and _ (4 to 40).')
    if (!user) return setError('Please log in again.')
    setBusy(true)
    try {
      const screenshotPath = file ? await uploadScreenshot(user.id, file) : undefined
      await api(`/api/orders/${order.id}/payment-proof`, {
        method: 'POST',
        body: { instapayReference: reference.trim() || undefined, screenshotPath },
      })
      setDone('Thank you! We will check your payment soon.')
      setOpen(false)
      setReference('')
      setFile(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-plum/10 pt-3">
      {done && <Notice tone="success">{done}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {open && (
        <form onSubmit={sendProof} className="space-y-3 rounded-2xl bg-white/60 p-3">
          <ProofFields reference={reference} onReference={setReference} file={file} onFile={setFile} disabled={busy} />
          <GlassButton type="submit" variant="plum" full disabled={busy}>
            {busy ? 'Sending...' : 'Send'}
          </GlassButton>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        {canSendProof && !open && (
          <GlassButton size="sm" onClick={() => setOpen(true)}>
            {order.payments.length > 0 && order.payments.every((p) => p.status === 'rejected') ? 'Send new payment proof' : 'Change payment proof'}
          </GlassButton>
        )}
        <GlassButton size="sm" variant="rose" disabled={busy} onClick={cancel}>
          Cancel order
        </GlassButton>
      </div>
    </div>
  )
}
