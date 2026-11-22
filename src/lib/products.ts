import { supabase, supabaseConfigError } from './supabase'
import type { CartLine, Product, ProductColor, ProductImage, ProductSize } from '../types'

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

/** Read all active products with their colors, sizes and images. */
export async function fetchProducts(): Promise<Product[]> {
  if (supabaseConfigError) throw new Error(supabaseConfigError)

  const { data, error } = await supabase
    .from('products')
    .select('*, product_colors(*), product_sizes(*), product_images(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return (data as unknown as Product[]).map((p) => ({
    ...p,
    product_colors: [...p.product_colors].sort(bySort),
    product_sizes: [...p.product_sizes].sort(bySort),
    product_images: [...p.product_images].sort(bySort),
  }))
}

// Keep the answer in memory, so we do not ask the database again on every page.
let cache: Promise<Product[]> | null = null

export function loadProducts(): Promise<Product[]> {
  if (!cache) {
    cache = fetchProducts().catch((err: unknown) => {
      cache = null
      throw err
    })
  }
  return cache
}

/** Public web address of a file in the product-images bucket. */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

export function mainImage(p: Product): ProductImage | null {
  return p.product_images[0] ?? null
}

export function mainImageUrl(p: Product): string | null {
  return imageUrl(mainImage(p)?.path)
}

/** "Owala FreeSip - Sage Green" -> { base: "Owala FreeSip", variant: "Sage Green" } */
export function splitName(p: Product): { base: string; variant: string } {
  const [base, ...rest] = p.name.split(' - ')
  return { base, variant: rest.join(' - ') || p.product_colors[0]?.name || '' }
}

export function sizePrice(p: Product, size: ProductSize | null): number {
  return size?.price_egp ?? p.price_egp
}

/** The old price is shown only when the size uses the normal product price. */
export function sizeOldPrice(p: Product, size: ProductSize | null): number | null {
  if (size?.price_egp != null) return null
  return p.compare_at_price_egp
}

export function firstColor(p: Product): ProductColor | null {
  return p.product_colors[0] ?? null
}

export function defaultSize(p: Product): ProductSize | null {
  return p.product_sizes.find((s) => s.in_stock) ?? null
}

export function isSoldOut(p: Product): boolean {
  const colorOut = p.product_colors.length > 0 && p.product_colors.every((c) => !c.in_stock)
  const sizeOut = p.product_sizes.length > 0 && p.product_sizes.every((s) => !s.in_stock)
  return colorOut || sizeOut
}

export function lineFromProduct(p: Product, size: ProductSize | null, quantity = 1): CartLine {
  const color = firstColor(p)
  return {
    key: `${p.id}:${size?.id ?? 'none'}`,
    productId: p.id,
    slug: p.slug,
    name: p.name,
    imagePath: mainImage(p)?.path ?? null,
    colorName: color?.name ?? null,
    colorHex: color?.hex ?? null,
    sizeId: size?.id ?? null,
    sizeLabel: size?.label ?? null,
    unitPrice: sizePrice(p, size),
    oldPrice: sizeOldPrice(p, size),
    quantity,
  }
}
