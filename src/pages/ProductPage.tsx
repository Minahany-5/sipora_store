import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import ErrorBox from '../components/ErrorBox'
import GlassButton from '../components/GlassButton'
import ProductImage from '../components/ProductImage'
import QtyStepper from '../components/QtyStepper'
import Skeleton from '../components/Skeleton'
import { useProducts } from '../hooks/useProducts'
import { formatEGP } from '../lib/format'
import { defaultSize, lineFromProduct, sizeOldPrice, sizePrice, splitName } from '../lib/products'
import { supabase } from '../lib/supabase'
import type { Product } from '../types'

interface ReviewSummary {
  average: number
  count: number
}

function useReviewSummary(productId: string | undefined): ReviewSummary | null {
  const [summary, setSummary] = useState<ReviewSummary | null>(null)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const ratings = (data as { rating: number }[]).map((r) => r.rating)
        setSummary({
          count: ratings.length,
          average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        })
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  return summary
}

export default function ProductPage() {
  const { slug } = useParams()
  const { products, error, loading, retry } = useProducts()
  const product = products?.find((p) => p.slug === slug) ?? null

  if (error) return <ErrorBox message={error} onRetry={retry} />
  if (loading) return <Skeleton className="h-[34rem]" />
  if (!product || !products) {
    return (
      <div className="pt-10 text-center">
        <h1 className="font-display text-2xl font-bold">We could not find this bottle.</h1>
        <div className="mt-4">
          <Link to="/discover" className="text-sm font-semibold underline">
            Back to Discover
          </Link>
        </div>
      </div>
    )
  }
  // key = reset the size and the quantity when the person opens another color
  return <ProductDetails key={product.id} product={product} all={products} />
}

function ProductDetails({ product, all }: { product: Product; all: Product[] }) {
  const navigate = useNavigate()
  const { add } = useCart()
  const reviews = useReviewSummary(product.id)
  const [sizeId, setSizeId] = useState<string | null>(defaultSize(product)?.id ?? null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const size = product.product_sizes.find((s) => s.id === sizeId) ?? null
  const unit = sizePrice(product, size)
  const oldUnit = sizeOldPrice(product, size)
  const colorOut = product.product_colors.length > 0 && product.product_colors.every((c) => !c.in_stock)
  const soldOut = colorOut || (product.product_sizes.length > 0 && size === null)
  const { base, variant } = splitName(product)
  const sameFamily = all.filter((p) => p.category === product.category)

  function handleAdd() {
    add(lineFromProduct(product, size, quantity))
    setAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <GlassButton size="icon" aria-label="Back" onClick={() => navigate('/discover')}>
          ‹
        </GlassButton>
        <GlassButton size="icon" aria-label="Go to bag" onClick={() => navigate('/cart')}>
          🛍
        </GlassButton>
      </div>

      <section className="mt-4 rounded-[2rem] bg-mint p-5 text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-plum/70">{variant} edition</p>
        <div className="mt-3 flex h-72 items-end justify-center">
          <ProductImage product={product} priority className="h-full max-w-full drop-shadow-2xl" />
        </div>
      </section>

      <h1 className="mt-5 font-display text-3xl font-bold leading-tight">{base}</h1>
      <p className="text-sm text-plum/70">{variant}</p>

      <p className="mt-2 text-sm">
        {reviews && reviews.count > 0 ? (
          <>
            <span aria-hidden="true">★</span> {reviews.average.toFixed(1)} ·{' '}
            {reviews.count} {reviews.count === 1 ? 'review' : 'reviews'}
          </>
        ) : (
          <span className="text-plum/60">No reviews yet</span>
        )}
      </p>

      {product.product_sizes.length > 0 && (
        <div className="mt-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-plum/60">Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.product_sizes.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!s.in_stock}
                aria-pressed={s.id === sizeId}
                onClick={() => setSizeId(s.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                  s.id === sizeId ? 'bg-plum text-white' : 'bg-white/60 text-plum'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.description && <p className="mt-4 text-sm leading-relaxed text-plum/80">{product.description}</p>}

      {sameFamily.length > 1 && (
        <div className="mt-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-plum/60">Colors</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {sameFamily.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                replace
                aria-label={splitName(p).variant}
                aria-current={p.id === product.id ? 'true' : undefined}
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/70 ${
                  p.id === product.id ? 'ring-2 ring-plum ring-offset-2 ring-offset-cream' : ''
                }`}
              >
                <ProductImage product={p} className="h-9 w-auto max-w-9" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <QtyStepper value={quantity} onChange={setQuantity} />
        <p className="text-right text-sm">
          {oldUnit != null && oldUnit > unit && <s className="me-2 text-plum/50">{formatEGP(oldUnit)}</s>}
          <span className="font-semibold">{formatEGP(unit)}</span>
        </p>
      </div>

      <div className="mt-5">
        <GlassButton variant="plum" size="lg" full disabled={soldOut} onClick={handleAdd}>
          {soldOut ? 'Sold out' : added ? 'Added ✓' : `Add to cart · ${formatEGP(unit * quantity)}`}
        </GlassButton>
      </div>
    </>
  )
}
