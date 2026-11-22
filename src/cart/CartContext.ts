import { createContext } from 'react'
import type { CartLine } from '../types'

export interface CartValue {
  lines: CartLine[]
  /** total number of items (for the badge on the Bag tab) */
  count: number
  subtotal: number
  add: (line: CartLine) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

export const CartContext = createContext<CartValue | null>(null)
