import { ordinal } from '../lib/format'
import type { LoyaltyInfo, StoreSettings } from '../types'

/** Steps 1, 2, % . The last step is the discount. Used in the Bag and in the Account screen. */
export default function LoyaltyCard({ settings, loyalty }: { settings: StoreSettings; loyalty: LoyaltyInfo | null }) {
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
