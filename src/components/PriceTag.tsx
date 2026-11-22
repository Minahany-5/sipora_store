import { formatEGP } from '../lib/format'

interface PriceTagProps {
  price: number
  oldPrice?: number | null
  className?: string
}

/** EGP 850  ~~EGP 1,350~~ */
export default function PriceTag({ price, oldPrice, className = '' }: PriceTagProps) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="font-semibold">{formatEGP(price)}</span>
      {oldPrice != null && oldPrice > price && (
        <s className="text-[0.8em] font-normal text-plum/50">{formatEGP(oldPrice)}</s>
      )}
    </span>
  )
}
