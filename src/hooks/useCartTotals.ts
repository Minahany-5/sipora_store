import { useCart } from '../cart/useCart'
import { useLoyalty } from './useLoyalty'
import { useSettings } from './useSettings'

/** Subtotal, loyalty discount, delivery and total for the bag. This is only a preview.
 *  The server calculates the real price when the order is placed. */
export function useCartTotals() {
  const { subtotal } = useCart()
  const { settings, error: settingsError } = useSettings()
  const loyalty = useLoyalty()

  const discount =
    loyalty?.discount_ready && settings ? Math.round(subtotal * settings.loyalty_discount_percent) / 100 : 0
  const delivery = settings?.delivery_fee_egp ?? null
  const total = delivery === null ? null : subtotal - discount + delivery

  return { subtotal, discount, delivery, total, settings, settingsError, loyalty }
}
