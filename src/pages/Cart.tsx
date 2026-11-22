import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import BottleIcon from '../components/BottleIcon'
import ErrorBox from '../components/ErrorBox'
import GlassButton from '../components/GlassButton'
import QtyStepper from '../components/QtyStepper'
import SafeImage from '../components/SafeImage'
import LoyaltyCard from '../components/LoyaltyCard'
import { useCartTotals } from '../hooks/useCartTotals'
import { formatEGP } from '../lib/format'
import { imageUrl } from '../lib/products'

export default function Cart() {
  const navigate = useNavigate()
  const { lines, setQuantity, remove } = useCart()
  const { subtotal, discount, delivery, total, settings, settingsError, loyalty } = useCartTotals()

  if (lines.length === 0) {
    return (
      <>
        <h1 className="font-display text-3xl font-bold">Your bag</h1>
        <div className="mt-10 flex flex-col items-center text-center">
          <BottleIcon className="h-32 opacity-80" />
          <p className="mt-4 font-display text-xl font-bold">Your bag is empty</p>
          <p className="mt-1 text-sm text-plum/70">Find your own Owala.</p>
          <div className="mt-5">
            <GlassButton variant="plum" onClick={() => navigate('/discover')}>
              Go to Discover
            </GlassButton>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Your bag</h1>

      <ul className="mt-4 space-y-3">
        {lines.map((line) => {
          const src = imageUrl(line.imagePath)
          return (
            <li key={line.key} className="flex gap-3 rounded-[1.5rem] bg-white/60 p-3">
              <Link
                to={`/product/${line.slug}`}
                className="flex h-24 w-20 shrink-0 items-end justify-center rounded-2xl bg-mint p-1"
              >
                <SafeImage src={src} alt={line.name} className="h-full" fallbackColor={line.colorHex ?? undefined} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">{line.name}</p>
                    <p className="text-xs text-plum/60">{line.sizeLabel ?? ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    aria-label={`Remove ${line.name}`}
                    className="-me-1 -mt-1 rounded-full p-2 text-plum/50 hover:text-plum"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{formatEGP(line.unitPrice * line.quantity)}</span>
                  <QtyStepper value={line.quantity} onChange={(q) => setQuantity(line.key, q)} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {settingsError && (
        <div className="mt-5">
          <ErrorBox message={settingsError} onRetry={() => window.location.reload()} />
        </div>
      )}

      {settings && <LoyaltyCard settings={settings} loyalty={loyalty} />}

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatEGP(subtotal)}</dd>
        </div>
        {discount > 0 && settings && (
          <div className="flex justify-between text-aqua">
            <dt>Loyalty discount ({settings.loyalty_discount_percent}%)</dt>
            <dd>− {formatEGP(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd>{delivery === null ? '...' : formatEGP(delivery)}</dd>
        </div>
        <div className="flex justify-between border-t border-plum/15 pt-3 font-display text-xl font-bold">
          <dt>Total</dt>
          <dd>{total === null ? '...' : formatEGP(total)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-plum/50">The final price is checked again at checkout.</p>

      <div className="mt-5">
        <GlassButton variant="plum" size="lg" full onClick={() => navigate('/checkout')}>
          Checkout
        </GlassButton>
      </div>
    </>
  )
}
