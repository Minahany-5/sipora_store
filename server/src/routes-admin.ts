import { Router } from 'express'
import { currentUser, requireStaff } from './auth.js'
import { orderStatusEmail, paymentApprovedEmail, paymentRejectedEmail } from './emails.js'
import { conflict, notFound } from './http.js'
import { loadOrder } from './orders-data.js'
import { idParam, rejectSchema, statusSchema } from './schemas.js'
import type { Deps, OrderStatus, PaymentRow } from './types.js'

/** Orders only move forward in this order. "cancelled" is allowed until the end. */
const FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed']

export function adminRouter(deps: Deps): Router {
  const router = Router()
  const { db } = deps
  router.use(requireStaff(deps))

  async function emailCustomer(userId: string, make: (to: string) => ReturnType<typeof orderStatusEmail>) {
    const to = await deps.getUserEmail(userId)
    if (!to) return
    const mail = make(to)
    if (mail) await deps.mailer.send(mail)
  }

  async function getPayment(id: string): Promise<PaymentRow> {
    const { data, error } = await db.from('payments').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw notFound('Payment not found')
    return data as PaymentRow
  }

  // ---------- Approve an Instapay payment ----------
  router.post('/payments/:id/approve', async (req, res) => {
    const staff = currentUser(res)
    const id = idParam.parse(req.params.id)
    const payment = await getPayment(id)
    if (payment.method !== 'instapay') throw conflict('Cash on delivery is marked paid when the order is completed.')

    const { data, error } = await db
      .from('payments')
      .update({ status: 'approved', reviewed_by: staff.id, reviewed_at: new Date().toISOString(), admin_note: null })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
    if (error) throw error
    if (!data?.length) throw conflict('This payment was already reviewed.')

    // A waiting order becomes "confirmed".
    await db.from('orders').update({ status: 'confirmed' }).eq('id', payment.order_id).eq('status', 'pending')

    const order = await loadOrder(deps, payment.order_id)
    if (order) await emailCustomer(order.user_id, (to) => paymentApprovedEmail(to, order))
    res.json({ ok: true, orderStatus: order?.status === 'pending' ? 'confirmed' : order?.status })
  })

  // ---------- Reject an Instapay payment ----------
  router.post('/payments/:id/reject', async (req, res) => {
    const staff = currentUser(res)
    const id = idParam.parse(req.params.id)
    const { note } = rejectSchema.parse(req.body ?? {})
    const payment = await getPayment(id)
    if (payment.method !== 'instapay') throw conflict('Only Instapay payments can be rejected.')

    const { data, error } = await db
      .from('payments')
      .update({ status: 'rejected', reviewed_by: staff.id, reviewed_at: new Date().toISOString(), admin_note: note ?? null })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
    if (error) throw error
    if (!data?.length) throw conflict('This payment was already reviewed.')

    const order = await loadOrder(deps, payment.order_id)
    if (order) await emailCustomer(order.user_id, (to) => paymentRejectedEmail(to, order, note ?? null))
    res.json({ ok: true })
  })

  // ---------- Change the order status ----------
  router.post('/orders/:id/status', async (req, res) => {
    const staff = currentUser(res)
    const id = idParam.parse(req.params.id)
    const { status: next } = statusSchema.parse(req.body)

    const order = await loadOrder(deps, id)
    if (!order) throw notFound('Order not found')
    const current = order.status
    if (current === 'completed' || current === 'cancelled') throw conflict(`This order is already ${current}.`)
    if (next === current) throw conflict(`The order is already ${current}.`)
    if (next !== 'cancelled' && FLOW.indexOf(next) <= FLOW.indexOf(current)) {
      throw conflict(`An order cannot go back from ${current} to ${next}.`)
    }

    // Instapay: the money must be confirmed before the order moves on.
    if (order.payment_method === 'instapay' && next !== 'cancelled') {
      const { data, error } = await db.from('payments').select('id').eq('order_id', id).eq('status', 'approved').limit(1)
      if (error) throw error
      if (!data?.length) throw conflict('Approve the Instapay payment first.')
    }

    // "where status = current" makes sure two people cannot change the same order at the same time.
    const { data, error } = await db.from('orders').update({ status: next }).eq('id', id).eq('status', current).select('id')
    if (error) throw error
    if (!data?.length) throw conflict('Someone just changed this order. Please refresh.')

    const now = new Date().toISOString()
    if (next === 'cancelled') {
      await db
        .from('payments')
        .update({ status: 'rejected', reviewed_by: staff.id, reviewed_at: now, admin_note: 'Order cancelled' })
        .eq('order_id', id)
        .eq('status', 'pending')
    }
    if (next === 'completed' && order.payment_method === 'cod') {
      await db
        .from('payments')
        .update({ status: 'approved', reviewed_by: staff.id, reviewed_at: now, admin_note: 'Cash received' })
        .eq('order_id', id)
        .eq('status', 'pending')
    }
    // When the status becomes "completed", the database adds 1 to the customer's loyalty count.

    await emailCustomer(order.user_id, (to) => orderStatusEmail(to, order, next))
    res.json({ ok: true, status: next })
  })

  return router
}
