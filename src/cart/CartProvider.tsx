import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartLine } from '../types'
import { CartContext, type CartValue } from './CartContext'

const STORAGE_KEY = 'sipora-cart-v1'
const MAX_QTY = 20 // the database allows 1 to 20 per item

function isLine(x: unknown): x is CartLine {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  return (
    typeof l.key === 'string' &&
    typeof l.productId === 'string' &&
    typeof l.slug === 'string' &&
    typeof l.name === 'string' &&
    typeof l.unitPrice === 'number' &&
    typeof l.quantity === 'number'
  )
}

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isLine) : []
  } catch {
    return []
  }
}

/** Keeps the bag on the phone, so customers can shop before they log in. */
export default function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadLines)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* private mode or full storage: the bag still works until the tab closes */
    }
  }, [lines])

  const value = useMemo<CartValue>(() => {
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
      add: (line) =>
        setLines((prev) => {
          const found = prev.find((l) => l.key === line.key)
          if (!found) return [...prev, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }]
          return prev.map((l) =>
            l.key === line.key ? { ...line, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l,
          )
        }),
      setQuantity: (key, quantity) =>
        setLines((prev) =>
          prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : l)),
        ),
      remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
      clear: () => setLines([]),
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
