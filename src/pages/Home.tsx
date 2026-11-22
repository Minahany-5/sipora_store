import { useEffect, useRef, useState } from 'react'
import { useCart } from '../cart/useCart'
import ErrorBox from '../components/ErrorBox'
import GlassButton from '../components/GlassButton'
import PriceTag from '../components/PriceTag'
import ProductImage from '../components/ProductImage'
import Skeleton from '../components/Skeleton'
import { useProducts } from '../hooks/useProducts'
import { defaultSize, isSoldOut, lineFromProduct, mainImageUrl, sizeOldPrice, sizePrice, splitName } from '../lib/products'

/** Home: big salmon card with the selected bottle. The color dots pick the product. */
export default function Home() {
  const { products, error, loading, retry } = useProducts()
  const { add } = useCart()
  const [index, setIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const product = products?.[index] ?? null

  function handleAdd() {
    if (!product) return
    add(lineFromProduct(product, defaultSize(product), 1))
    setAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), 1400)
  }

  async function handleShare() {
    if (!product) return
    const url = `${window.location.origin}/product/${product.slug}`
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* the person closed the share sheet: nothing to do */
    }
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">sipora.</h1>
        <GlassButton size="sm">EN</GlassButton>
      </header>

      {error && (
        <div className="mt-5">
          <ErrorBox message={error} onRetry={retry} />
        </div>
      )}

      {loading && (
        <>
          <Skeleton className="mt-5 h-80" />
          <Skeleton className="mt-5 h-16" />
        </>
      )}

      {product && products && (
        <>
          <section className="relative mt-5 min-h-80 overflow-hidden rounded-[2rem] bg-salmon p-6">
            <h2 className="font-display text-5xl font-bold leading-[1.05] text-white">
              Sip.
              <br />
              Your way.
            </h2>
            <p className="mt-16 max-w-[8rem] text-[0.65rem] font-semibold uppercase tracking-widest">
              Cold drinks. Good days.
            </p>
            {mainImageUrl(product) && (
              <ProductImage
                key={product.id}
                product={product}
                priority
                className="absolute right-5 top-10 h-52 rotate-[14deg] drop-shadow-xl"
              />
            )}
            <div className="mt-10 flex gap-2">
              <GlassButton size="sm" onClick={handleShare}>
                Share
              </GlassButton>
            </div>
          </section>

          <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-plum/60">
            {product.is_new ? 'New' : 'Featured'} · {index + 1}/{products.length}
          </p>
          <h3 className="font-display text-2xl font-bold">{splitName(product).base}</h3>
          <p className="text-sm text-plum/70">{splitName(product).variant}</p>
          <PriceTag
            className="mt-1 text-sm"
            price={sizePrice(product, defaultSize(product))}
            oldPrice={sizeOldPrice(product, defaultSize(product))}
          />

          <div className="mt-3 flex flex-wrap gap-2.5">
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={splitName(p).variant}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`h-6 w-6 rounded-full border border-white/70 ${
                  i === index ? 'ring-2 ring-plum ring-offset-2 ring-offset-cream' : ''
                }`}
                style={{ background: p.product_colors[0]?.hex ?? '#cccccc' }}
              />
            ))}
          </div>

          <div className="mt-6">
            <GlassButton variant="plum" size="lg" full disabled={isSoldOut(product)} onClick={handleAdd}>
              {isSoldOut(product) ? 'Sold out' : added ? 'Added ✓' : 'Add to cart'}
            </GlassButton>
          </div>
        </>
      )}
    </>
  )
}
