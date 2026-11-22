import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBox from '../components/ErrorBox'
import GlassButton from '../components/GlassButton'
import Skeleton from '../components/Skeleton'
import { useSession } from '../hooks/useSession'
import { formatDate, formatEGP } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { OrderRow, OrderStatus } from '../types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Waiting',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'On the way',
  completed: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-lime',
  confirmed: 'bg-mint',
  preparing: 'bg-mint',
  out_for_delivery: 'bg-lavender',
  completed: 'bg-mint',
  cancelled: 'bg-rose',
}

export default function Orders() {
  const navigate = useNavigate()
  const { session, ready } = useSession()
  const userId = session?.user.id ?? null
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('orders')
      .select(
        'id, order_number, status, payment_method, total_egp, created_at, order_items(product_name, color_name, size_label, quantity), payments(status)',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setOrders(data as unknown as OrderRow[])
      })
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  return (
    <>
      <div className="flex items-center gap-3">
        <GlassButton size="icon" aria-label="Back" onClick={() => navigate('/account')}>
          ‹
        </GlassButton>
        <h1 className="font-display text-3xl font-bold">Orders</h1>
      </div>

      {!ready && <Skeleton className="mt-5 h-28" />}

      {ready && !userId && (
        <div className="mt-6 rounded-[1.75rem] bg-lavender p-5 text-center">
          <p className="font-display text-lg font-bold">Log in to see your orders</p>
          <p className="mt-1 text-sm text-plum/70">Login and sign up are coming in Step 5.</p>
        </div>
      )}

      {userId && error && (
        <div className="mt-5">
          <ErrorBox message={error} onRetry={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }} />
        </div>
      )}

      {userId && !error && orders === null && <Skeleton className="mt-5 h-28" />}

      {orders && orders.length === 0 && (
        <div className="mt-8 text-center">
          <p className="font-display text-xl font-bold">No orders yet</p>
          <div className="mt-4">
            <GlassButton variant="plum" onClick={() => navigate('/discover')}>
              Go to Discover
            </GlassButton>
          </div>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-5 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[1.5rem] bg-white/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold">Order #{o.order_number}</p>
                  <p className="text-xs text-plum/60">{formatDate(o.created_at)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONE[o.status]}`}>
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-plum/80">
                {o.order_items.map((item, i) => (
                  <li key={i}>
                    {item.quantity} × {item.product_name}
                    {item.size_label ? ` · ${item.size_label}` : ''}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-plum/60">
                  {o.payment_method === 'cod'
                    ? 'Cash on delivery'
                    : o.payments[0]?.status === 'approved'
                      ? 'Instapay · paid'
                      : o.payments[0]?.status === 'rejected'
                        ? 'Instapay · not accepted'
                        : 'Instapay · waiting for approval'}
                </span>
                <span className="font-semibold">{formatEGP(o.total_egp)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
