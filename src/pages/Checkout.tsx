import { useNavigate } from 'react-router-dom'
import GlassButton from '../components/GlassButton'

/** Placeholder. The real checkout (address, Instapay, place order) comes in Step 4. */
export default function Checkout() {
  const navigate = useNavigate()
  return (
    <>
      <div className="flex items-center gap-3">
        <GlassButton size="icon" aria-label="Back" onClick={() => navigate('/cart')}>
          ‹
        </GlassButton>
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
      </div>
      <section className="mt-5 rounded-[1.75rem] bg-lime p-5">
        <p className="font-display text-lg font-bold">Almost ready</p>
        <p className="mt-1 text-sm text-plum/70">
          Delivery, Instapay, and Place order will be built in Step 4. Your bag is saved.
        </p>
      </section>
    </>
  )
}
