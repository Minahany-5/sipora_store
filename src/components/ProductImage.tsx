import { mainImage, imageUrl } from '../lib/products'
import type { Product } from '../types'
import BottleIcon from './BottleIcon'

interface ProductImageProps {
  product: Product
  className?: string
  /** set true for the first image on the screen, so it loads fast */
  priority?: boolean
}

/** The product photo. If there is no photo, show the simple bottle drawing. */
export default function ProductImage({ product, className = '', priority = false }: ProductImageProps) {
  const img = mainImage(product)
  const src = imageUrl(img?.path)

  if (!src) {
    return <BottleIcon color={product.product_colors[0]?.hex} className={className} />
  }
  return (
    <img
      src={src}
      alt={img?.alt ?? product.name}
      className={`object-contain ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}
