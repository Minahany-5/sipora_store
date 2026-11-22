import type { SupabaseClient } from '@supabase/supabase-js'
import type { Config } from './config.js'
import type { Mailer } from './emails.js'

export interface AuthUser {
  id: string
  email: string | null
}

/** Everything the app needs from the outside. Tests can replace these parts. */
export interface Deps {
  config: Config
  db: SupabaseClient
  mailer: Mailer
  /** token from the website -> the logged-in user (or null) */
  verifyToken: (token: string) => Promise<AuthUser | null>
  /** email address of a customer */
  getUserEmail: (userId: string) => Promise<string | null>
  /** does this file exist in the private payment-screenshots bucket? */
  screenshotExists: (path: string) => Promise<boolean>
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'completed' | 'cancelled'

export interface OrderItemRow {
  product_name: string
  color_name: string | null
  size_label: string | null
  unit_price_egp: number
  quantity: number
}

export interface OrderRow {
  id: string
  order_number: number
  user_id: string
  status: OrderStatus
  payment_method: 'instapay' | 'cod'
  subtotal_egp: number
  discount_egp: number
  delivery_fee_egp: number
  total_egp: number
  loyalty_applied: boolean
  customer_name: string
  customer_phone: string
  address_text: string
  order_items?: OrderItemRow[]
}

export interface PaymentRow {
  id: string
  order_id: string
  method: 'instapay' | 'cod'
  status: 'pending' | 'approved' | 'rejected'
  amount_egp: number
  instapay_reference: string | null
  screenshot_path: string | null
  created_at: string
}
