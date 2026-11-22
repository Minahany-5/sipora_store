import { useMemo, useState } from 'react'
import ErrorBox from '../components/ErrorBox'
import ProductCard from '../components/ProductCard'
import Skeleton from '../components/Skeleton'
import { useProducts } from '../hooks/useProducts'
import type { Product } from '../types'

// Card colors from the approved design. They repeat in this order.
const TONES = ['bg-mint', 'bg-rose', 'bg-lime', 'bg-lavender']

type Chip = { id: string; label: string; test: (p: Product) => boolean }

const FIXED_CHIPS: Chip[] = [
  { id: 'for-you', label: 'For you', test: () => true },
  { id: 'new', label: 'New', test: (p) => p.is_new },
  { id: 'best', label: 'Best sellers', test: (p) => p.is_featured },
]

export default function Discover() {
  const { products, error, loading, retry } = useProducts()
  const [chipId, setChipId] = useState('for-you')
  const [query, setQuery] = useState('')

  // One chip for each size that exists in the database (for example "710 ml")
  const chips = useMemo<Chip[]>(() => {
    const labels = new Set<string>()
    products?.forEach((p) => p.product_sizes.forEach((s) => labels.add(s.label)))
    const sizeChips = [...labels].map<Chip>((label) => ({
      id: `size:${label}`,
      label,
      test: (p) => p.product_sizes.some((s) => s.label === label),
    }))
    return [...FIXED_CHIPS, ...sizeChips]
  }, [products])

  const visible = useMemo(() => {
    if (!products) return []
    const chip = chips.find((c) => c.id === chipId) ?? chips[0]
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) => chip.test(p) && (q === '' || `${p.name} ${p.category ?? ''}`.toLowerCase().includes(q)),
    )
  }, [products, chips, chipId, query])

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Discover</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bottles"
        aria-label="Search bottles"
        className="mt-4 w-full rounded-full border border-white/90 bg-white/60 px-5 py-3 text-sm outline-none placeholder:text-plum/40 focus:ring-2 focus:ring-plum/40"
      />

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Filters">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === chipId}
            onClick={() => setChipId(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              c.id === chipId ? 'bg-plum text-white' : 'bg-white/60 text-plum/70'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5">
          <ErrorBox message={error} onRetry={retry} />
        </div>
      )}

      {loading && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      )}

      {products && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {visible.map((p, i) => (
              <ProductCard key={p.id} product={p} tone={TONES[i % TONES.length]} />
            ))}
          </div>
          {visible.length === 0 && <p className="mt-8 text-center text-sm text-plum/70">No bottles found. Try another word.</p>}
        </>
      )}
    </>
  )
}
