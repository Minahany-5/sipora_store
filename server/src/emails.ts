import { Resend } from 'resend'
import type { Config } from './config.js'
import type { OrderRow } from './types.js'

export interface Mail {
  to: string
  subject: string
  html: string
  text: string
}

export interface Mailer {
  /** Never throws. Returns true when the email was sent. */
  send: (mail: Mail) => Promise<boolean>
}

/** Sends with Resend. Without an API key it only prints a line (good for testing). */
export function createMailer(config: Config): Mailer {
  if (!config.resendApiKey) {
    return {
      async send(mail) {
        console.log(`[email skipped: no RESEND_API_KEY] to=${mail.to} subject="${mail.subject}"`)
        return false
      },
    }
  }
  const resend = new Resend(config.resendApiKey)
  return {
    async send(mail) {
      try {
        const { error } = await resend.emails.send({
          from: config.emailFrom,
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        })
        if (error) {
          console.warn(`[email failed] to=${mail.to} subject="${mail.subject}": ${error.message}`)
          return false
        }
        return true
      } catch (err) {
        console.warn(`[email failed] to=${mail.to}: ${err instanceof Error ? err.message : String(err)}`)
        return false
      }
    },
  }
}

// ---------- helpers ----------
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const egp = (n: number) => `EGP ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FBF6EC;font-family:Arial,Helvetica,sans-serif;color:#4A1F28">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <h1 style="font-family:Georgia,serif;font-size:28px;margin:0 0 16px">sipora.</h1>
  <div style="background:#ffffff;border-radius:20px;padding:24px">
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px">${esc(title)}</h2>
    ${bodyHtml}
  </div>
  <p style="font-size:12px;color:#4A1F28;opacity:.6;margin-top:16px">Sipora · Cairo, Egypt · WhatsApp +20 1210033628</p>
</div></body></html>`
}

function itemsHtml(order: OrderRow): string {
  const rows = (order.order_items ?? [])
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.quantity} × ${esc(i.product_name)}${i.size_label ? ` · ${esc(i.size_label)}` : ''}</td><td style="padding:4px 0;text-align:right">${egp(i.unit_price_egp * i.quantity)}</td></tr>`,
    )
    .join('')
  const discount = order.discount_egp > 0 ? `<tr><td>Loyalty discount</td><td style="text-align:right">− ${egp(order.discount_egp)}</td></tr>` : ''
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:8px;border-top:1px solid #eee">Subtotal</td><td style="padding-top:8px;border-top:1px solid #eee;text-align:right">${egp(order.subtotal_egp)}</td></tr>
${discount}
<tr><td>Delivery</td><td style="text-align:right">${egp(order.delivery_fee_egp)}</td></tr>
<tr><td style="padding-top:6px;font-weight:bold">Total</td><td style="padding-top:6px;font-weight:bold;text-align:right">${egp(order.total_egp)}</td></tr></table>`
}

function itemsText(order: OrderRow): string {
  const lines = (order.order_items ?? []).map(
    (i) => `- ${i.quantity} x ${i.product_name}${i.size_label ? ` (${i.size_label})` : ''}: ${egp(i.unit_price_egp * i.quantity)}`,
  )
  return [
    ...lines,
    `Subtotal: ${egp(order.subtotal_egp)}`,
    ...(order.discount_egp > 0 ? [`Loyalty discount: -${egp(order.discount_egp)}`] : []),
    `Delivery: ${egp(order.delivery_fee_egp)}`,
    `Total: ${egp(order.total_egp)}`,
  ].join('\n')
}

const payLine = (o: OrderRow) =>
  o.payment_method === 'cod'
    ? 'You pay in cash when the order arrives.'
    : 'We will check your Instapay payment and tell you very soon.'

// ---------- emails to the customer ----------
export function orderPlacedEmail(to: string, order: OrderRow): Mail {
  const n = order.order_number
  return {
    to,
    subject: `We got your order #${n}`,
    html: layout(
      `Thank you, ${order.customer_name}!`,
      `<p style="font-size:14px">We got your order <b>#${n}</b>. ${esc(payLine(order))}</p>${itemsHtml(order)}
       <p style="font-size:14px;margin-top:16px">Delivery to: ${esc(order.address_text)}</p>`,
    ),
    text: `Thank you, ${order.customer_name}!\nWe got your order #${n}. ${payLine(order)}\n\n${itemsText(order)}\n\nDelivery to: ${order.address_text}`,
  }
}

export function paymentApprovedEmail(to: string, order: OrderRow): Mail {
  const n = order.order_number
  return {
    to,
    subject: `Payment received for order #${n}`,
    html: layout('Your payment is confirmed', `<p style="font-size:14px">Thank you! We got your Instapay payment for order <b>#${n}</b> (${egp(order.total_egp)}). We are getting your order ready.</p>`),
    text: `Thank you! We got your Instapay payment for order #${n} (${egp(order.total_egp)}). We are getting your order ready.`,
  }
}

export function paymentRejectedEmail(to: string, order: OrderRow, note: string | null): Mail {
  const n = order.order_number
  const why = note ? ` Note from us: ${note}` : ''
  return {
    to,
    subject: `We could not confirm the payment for order #${n}`,
    html: layout(
      'We could not confirm your payment',
      `<p style="font-size:14px">We could not find your Instapay payment for order <b>#${n}</b>.${esc(why)}</p>
       <p style="font-size:14px">Please send the correct reference number or screenshot in the app, or message us on WhatsApp +20 1210033628.</p>`,
    ),
    text: `We could not find your Instapay payment for order #${n}.${why}\nPlease send the correct reference number or screenshot in the app, or message us on WhatsApp +20 1210033628.`,
  }
}

const STATUS_COPY: Record<string, { subject: string; line: string } | undefined> = {
  confirmed: { subject: 'is confirmed', line: 'Your order is confirmed. We will prepare it soon.' },
  out_for_delivery: { subject: 'is on the way', line: 'Your order is on the way to you. Please keep your phone near you.' },
  completed: { subject: 'was delivered', line: 'Your order was delivered. Thank you for choosing Sipora!' },
  cancelled: { subject: 'was cancelled', line: 'Your order was cancelled. If this is a mistake, message us on WhatsApp +20 1210033628.' },
}

/** Returns null for a status that needs no email. */
export function orderStatusEmail(to: string, order: OrderRow, status: string): Mail | null {
  const copy = STATUS_COPY[status]
  if (!copy) return null
  const n = order.order_number
  return {
    to,
    subject: `Order #${n} ${copy.subject}`,
    html: layout(`Order #${n} ${copy.subject}`, `<p style="font-size:14px">${esc(copy.line)}</p>`),
    text: `Order #${n} ${copy.subject}\n${copy.line}`,
  }
}

// ---------- emails to you (the store owner) ----------
export function newOrderAdminEmail(to: string, order: OrderRow, customerEmail: string | null): Mail {
  const n = order.order_number
  const how = order.payment_method === 'cod' ? 'Cash on delivery' : 'Instapay (check the payment!)'
  return {
    to,
    subject: `New order #${n} · ${egp(order.total_egp)} · ${order.payment_method === 'cod' ? 'COD' : 'Instapay'}`,
    html: layout(
      `New order #${n}`,
      `<p style="font-size:14px"><b>${esc(order.customer_name)}</b> · ${esc(order.customer_phone)}${customerEmail ? ` · ${esc(customerEmail)}` : ''}<br>${esc(order.address_text)}<br>Payment: ${how}</p>${itemsHtml(order)}`,
    ),
    text: `New order #${n}\n${order.customer_name} · ${order.customer_phone}\n${order.address_text}\nPayment: ${how}\n\n${itemsText(order)}`,
  }
}

export function paymentProofAdminEmail(to: string, order: OrderRow): Mail {
  const n = order.order_number
  return {
    to,
    subject: `New Instapay proof for order #${n}`,
    html: layout(`Instapay proof for order #${n}`, `<p style="font-size:14px">${esc(order.customer_name)} sent a new Instapay proof for ${egp(order.total_egp)}. Please check it and approve or reject it.</p>`),
    text: `${order.customer_name} sent a new Instapay proof for order #${n} (${egp(order.total_egp)}). Please check it and approve or reject it.`,
  }
}
