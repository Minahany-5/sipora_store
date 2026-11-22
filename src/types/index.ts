// Shared types. We will fill these in step 2 when the Supabase tables exist.

export interface Product {
  id: string
  name: string
  size_oz: number
  price_egp: number
  colors: string[]
  image_url: string | null
  in_stock: boolean
}
