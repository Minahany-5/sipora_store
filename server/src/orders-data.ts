import type { PostgrestError } from '@supabase/supabase-js'
import { HttpError } from './http.js'
import type { Deps, OrderRow, PaymentRow } from './types.js'

/** One order with its items. */
export async function loadOrder(deps: Deps, id: string): Promise<OrderRow | null> {
  const { data, error } = await deps.db.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as OrderRow | null) ?? null
}

/** The newest payment of an order. */
export async function latestPayment(deps: Deps, orderId: string): Promise<PaymentRow | null> {
  const { data, error } = await deps.db
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as PaymentRow | null) ?? null
}

/** Turns a database error into a clear HTTP error for the customer. */
export function mapDbError(error: PostgrestError): Error {
  // Our own messages from create_order look like: "sipora:OUT_OF_STOCK Some text."
  const m = /^sipora:([A-Z_]+)\s+(.*)$/s.exec(error.message)
  if (m) {
    const status = m[1] === 'OUT_OF_STOCK' || m[1] === 'PRODUCT_UNAVAILABLE' ? 409 : 400
    return new HttpError(status, m[2])
  }
  if (error.code === '23505') return new HttpError(409, 'This Instapay reference was already used for another order.')
  if (error.code === '22P02') return new HttpError(400, 'The request is not valid.')
  return error as unknown as Error
}
