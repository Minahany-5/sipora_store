import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import BottleIcon from '../components/BottleIcon'
import GlassButton from '../components/GlassButton'
import QtyStepper from '../components/QtyStepper'
import { useLoyalty } from '../hooks/useLoyalty'
import { useSettings } from '../hooks/useSettings'
import { formatEGP, ordinal } from '../lib/format'
import { imageUrl } from '../lib/products'
import type { LoyaltyInfo, StoreSettings } from '../types'

export default function Cart() {
  const navigate = useNavigate()
  const { lines, subtotal, setQuantity, remove } = useCart()
  const settings = useSettings()
  const loyalty = useLoyalty()

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

  // This is only a preview. The server checks the real discount at checkout (Step 4).
  const discount =
    loyalty?.discount_ready && settings
      ? Math.round(subtotal * settings.loyalty_discount_percent) / 100
      : 0
  const delivery = settings?.delivery_fee_egp ?? null
  const total = delivery === null ? null : subtotal - discount + delivery

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
                {src ? (
                  <img src={src} alt={line.name} className="h-full object-contain" loading="lazy" decoding="async" />
                ) : (
                  <BottleIcon color={line.colorHex ?? undefined} className="h-full" />
                )}
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

/** Steps 1, 2, % . The last step is the discount. */
function LoyaltyCard({ settings, loyalty }: { settings: StoreSettings; loyalty: LoyaltyInfo | null }) {
  const required = settings.loyalty_orders_required
  const percent = settings.loyalty_discount_percent
  const current = loyalty?.current_step ?? 0 // 0 = not logged in

  let message: string
  if (!loyalty) {
    message = `Your ${ordinal(required)} order unlocks ${percent}% off. Log in to see your progress.`
  } else if (loyalty.discount_ready) {
    message = `This is your ${ordinal(required)} order: ${percent}% off!`
  } else {
    message = `Order ${current} of ${required}. Your ${ordinal(required)} order unlocks ${percent}% off.`
  }

  return (
    <section className="mt-5 rounded-[1.5rem] bg-lavender p-4">
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: required }, (_, i) => {
          const step = i + 1
          const isDiscount = step === required
          const done = current > 0 && step < current
          const here = current > 0 && step === current
          return (
            <div key={step} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  done || here ? 'bg-plum text-white' : 'bg-white/70 text-plum'
                } ${here ? 'ring-2 ring-plum ring-offset-2 ring-offset-lavender' : ''}`}
              >
                {isDiscount ? '%' : step}
              </span>
              {!isDiscount && <span className="h-1 flex-1 rounded-full bg-white/70" />}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-sm font-medium">{message}</p>
    </section>
  )
}
