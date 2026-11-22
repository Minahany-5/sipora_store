import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { currentUser, requireUser } from './auth.js'
import { newOrderAdminEmail, orderPlacedEmail, orderStatusEmail, paymentProofAdminEmail } from './emails.js'
import { badRequest, conflict, notFound } from './http.js'
import { latestPayment, loadOrder, mapDbError } from './orders-data.js'
import { createOrderSchema, idParam, paymentProofSchema } from './schemas.js'
import type { Deps } from './types.js'

export function ordersRouter(deps: Deps): Router {
  const router = Router()
  const { db } = deps

  // One internet address can place only a few orders in 15 minutes (default 20).
  const orderLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: deps.config.orderRateLimit, standardHeaders: 'draft-7', legacyHeaders: false })

  /** The screenshot must be in the customer's own folder, and it must really exist. */
  async function checkScreenshot(userId: string, path: string | undefined) {
    if (!path) return
    if (!path.startsWith(`${userId}/`)) throw badRequest('Bad screenshot path')
    if (!(await deps.screenshotExists(path))) throw badRequest('We could not find your screenshot. Please upload it again.')
  }

  // ---------- Place an order ----------
  router.post('/', orderLimit, requireUser(deps), async (req, res) => {
    const user = currentUser(res)
    const body = createOrderSchema.parse(req.body)
    await checkScreenshot(user.id, body.screenshotPath)

    // NOTE: the website sends NO prices. The database function reads the real prices.
    const { data, error } = await db.rpc('create_order', {
      p_user: user.id,
      p: {
        items: body.items.map((i) => ({
          product_id: i.productId,
          size_id: i.sizeId ?? null,
          color_id: i.colorId ?? null,
          quantity: i.quantity,
        })),
        payment_method: body.paymentMethod,
        customer_name: body.customer.name,
        customer_phone: body.customer.phone,
        address_text: body.address.text,
        latitude: body.address.latitude ?? null,
        longitude: body.address.longitude ?? null,
        notes: body.notes ?? null,
        instapay_reference: body.instapayReference ?? null,
        screenshot_path: body.screenshotPath ?? null,
      },
    })
    if (error) throw mapDbError(error)

    const created = data as { id: string; order_number: number; total_egp: number; subtotal_egp: number; discount_egp: number; delivery_fee_egp: number; loyalty_applied: boolean }

    // Emails never stop the order. If they fail, the order is still saved.
    const order = await loadOrder(deps, created.id)
    if (order) {
      const jobs: Promise<unknown>[] = []
      if (user.email) jobs.push(deps.mailer.send(orderPlacedEmail(user.email, order)))
      if (deps.config.adminEmail) jobs.push(deps.mailer.send(newOrderAdminEmail(deps.config.adminEmail, order, user.email)))
      await Promise.allSettled(jobs)
    }

    res.status(201).json({
      order: {
        id: created.id,
        orderNumber: created.order_number,
        status: 'pending',
        subtotal: created.subtotal_egp,
        discount: created.discount_egp,
        deliveryFee: created.delivery_fee_egp,
        total: created.total_egp,
        loyaltyApplied: created.loyalty_applied,
      },
    })
  })

  // ---------- Add (or replace) the Instapay proof ----------
  router.post('/:id/payment-proof', requireUser(deps), async (req, res) => {
    const user = currentUser(res)
    const id = idParam.parse(req.params.id)
    const body = paymentProofSchema.parse(req.body)

    const order = await loadOrder(deps, id)
    if (!order || order.user_id !== user.id) throw notFound('Order not found')
    if (order.payment_method !== 'instapay') throw badRequest('This order is not paid with Instapay.')
    if (order.status !== 'pending') throw conflict('This order is already being handled.')
    await checkScreenshot(user.id, body.screenshotPath)

    const payment = await latestPayment(deps, order.id)
    if (payment?.status === 'approved') throw conflict('Your payment was already approved.')

    if (payment && payment.status === 'pending') {
      const { data, error } = await db
        .from('payments')
        .update({
          instapay_reference: body.instapayReference ?? payment.instapay_reference,
          screenshot_path: body.screenshotPath ?? payment.screenshot_path,
        })
        .eq('id', payment.id)
        .eq('status', 'pending')
        .select('id')
      if (error) throw mapDbError(error)
      if (!data?.length) throw conflict('Your payment was just reviewed. Please refresh.')
    } else {
      // The last proof was rejected: start a new payment row.
      const { error } = await db.from('payments').insert({
        order_id: order.id,
        method: 'instapay',
        status: 'pending',
        amount_egp: order.total_egp,
        instapay_reference: body.instapayReference ?? null,
        screenshot_path: body.screenshotPath ?? null,
      })
      if (error) throw mapDbError(error)
    }

    if (deps.config.adminEmail) await deps.mailer.send(paymentProofAdminEmail(deps.config.adminEmail, order))
    res.json({ ok: true })
  })

  // ---------- The customer cancels (only while the order is still waiting) ----------
  router.post('/:id/cancel', requireUser(deps), async (req, res) => {
    const user = currentUser(res)
    const id = idParam.parse(req.params.id)

    const { data, error } = await db
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select('id')
    if (error) throw error
    if (!data?.length) {
      const exists = await loadOrder(deps, id)
      if (!exists || exists.user_id !== user.id) throw notFound('Order not found')
      throw conflict('Only a waiting order can be cancelled. Please message us on WhatsApp.')
    }

    await db
      .from('payments')
      .update({ status: 'rejected', admin_note: 'Cancelled by the customer', reviewed_at: new Date().toISOString() })
      .eq('order_id', id)
      .eq('status', 'pending')

    const order = await loadOrder(deps, id)
    if (order && user.email) {
      const mail = orderStatusEmail(user.email, order, 'cancelled')
      if (mail) await deps.mailer.send(mail)
    }
    res.json({ ok: true, status: 'cancelled' })
  })

  return router
}
