import { useEffect, useState } from 'react'
import { loadProducts } from '../lib/products'
import type { Product } from '../types'

export function useProducts() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadProducts()
      .then((list) => {
        if (!cancelled) setProducts(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return {
    products,
    error,
    loading: products === null && error === null,
    retry: () => {
      setError(null)
      setAttempt((n) => n + 1)
    },
  }
}
