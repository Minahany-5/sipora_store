import { imageUrl, mainImage } from '../lib/products'
import type { Product } from '../types'
import SafeImage from './SafeImage'

interface ProductImageProps {
  product: Product
  className?: string
  /** set true for the first image on the screen, so it loads fast */
  priority?: boolean
}

/** The product photo. If there is no photo (or it cannot load), show the simple bottle drawing. */
export default function ProductImage({ product, className = '', priority = false }: ProductImageProps) {
  const img = mainImage(product)
  return (
    <SafeImage
      src={imageUrl(img?.path)}
      alt={img?.alt ?? product.name}
      className={className}
      priority={priority}
      fallbackColor={product.product_colors[0]?.hex}
    />
  )
}
