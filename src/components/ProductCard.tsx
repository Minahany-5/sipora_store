import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import { defaultSize, isSoldOut, lineFromProduct, sizeOldPrice, sizePrice, splitName } from '../lib/products'
import type { Product } from '../types'
import GlassButton from './GlassButton'
import PriceTag from './PriceTag'
import ProductImage from './ProductImage'

interface ProductCardProps {
  product: Product
  /** a Tailwind background class, for example "bg-mint" */
  tone: string
}

/** A colored card for the Discover screen. */
export default function ProductCard({ product, tone }: ProductCardProps) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const size = defaultSize(product)
  const soldOut = isSoldOut(product)
  const { base, variant } = splitName(product)

  function handleAdd() {
    add(lineFromProduct(product, size, 1))
    setAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <article className={`flex flex-col rounded-[1.75rem] p-3 ${tone}`}>
      <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className="flex h-44 items-end justify-center">
          <ProductImage product={product} className="h-full max-w-full drop-shadow-lg" />
        </div>
        <p className="mt-3 text-[0.6rem] font-semibold uppercase tracking-widest text-plum/60">{base}</p>
        <h3 className="font-display text-lg font-bold leading-tight">{variant}</h3>
      </Link>
      <div className="mt-2 flex flex-1 flex-col justify-end gap-2">
        <PriceTag price={sizePrice(product, size)} oldPrice={sizeOldPrice(product, size)} className="text-sm" />
        <GlassButton size="sm" variant="plum" disabled={soldOut} onClick={handleAdd}>
          {soldOut ? 'Sold out' : added ? 'Added ✓' : 'Add +'}
        </GlassButton>
      </div>
    </article>
  )
}
