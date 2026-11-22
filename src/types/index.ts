// Shared types. They match the Supabase tables from Step 2 (schema.sql).

export interface ProductColor {
  id: string
  name: string
  hex: string
  in_stock: boolean
  sort_order: number
}

export interface ProductSize {
  id: string
  label: string
  /** empty (null) = use the product price */
  price_egp: number | null
  in_stock: boolean
  sort_order: number
}

export interface ProductImage {
  id: string
  /** path inside the "product-images" bucket */
  path: string
  alt: string | null
  color_id: string | null
  sort_order: number
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  price_egp: number
  /** old price, shown crossed out */
  compare_at_price_egp: number | null
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  product_colors: ProductColor[]
  product_sizes: ProductSize[]
  product_images: ProductImage[]
}

export interface StoreSettings {
  loyalty_orders_required: number
  loyalty_discount_percent: number
  delivery_fee_egp: number
  instapay_handle: string | null
  whatsapp_number: string
}

/** One row in the shopping bag. Saved on the phone (localStorage). */
export interface CartLine {
  /** productId + sizeId, so the same item is never added twice */
  key: string
  productId: string
  slug: string
  name: string
  imagePath: string | null
  colorName: string | null
  colorHex: string | null
  sizeId: string | null
  sizeLabel: string | null
  unitPrice: number
  oldPrice: number | null
  quantity: number
}

export interface LoyaltyInfo {
  completed_orders: number
  orders_required: number
  current_step: number
  discount_ready: boolean
  discount_percent: number
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'

export interface OrderRow {
  id: string
  order_number: number
  status: OrderStatus
  payment_method: 'instapay' | 'cod'
  total_egp: number
  created_at: string
  order_items: { product_name: string; color_name: string | null; size_label: string | null; quantity: number }[]
  payments: { status: 'pending' | 'approved' | 'rejected' }[]
}

export type UserRole = 'admin' | 'staff' | 'customer'

/** One row of the "profiles" table (the logged-in person). */
export interface Profile {
  full_name: string | null
  phone: string | null
  role: UserRole
  completed_orders: number
  language: string
  theme: 'light' | 'dark'
}

/** One row of the "addresses" table. */
export interface Address {
  id: string
  label: string
  full_address: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  created_at: string
}

/** The answer of POST /api/orders (from the Node server). */
export interface PlacedOrder {
  id: string
  orderNumber: number
  status: 'pending'
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  loyaltyApplied: boolean
}
