import { useState } from 'react'
import BottleIcon from '../components/BottleIcon'
import BottomNav, { type Tab } from '../components/BottomNav'
import GlassButton from '../components/GlassButton'

const COLORS = ['#2fb5a3', '#e48aa8', '#8d97d9', '#f1c453']

/** Starter Home screen. In step 3 this will load real products from Supabase. */
export default function Home() {
  const [tab, setTab] = useState<Tab>('home')
  const [color, setColor] = useState(COLORS[0])

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-32 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">sipora.</h1>
        <GlassButton size="sm">EN</GlassButton>
      </header>

      <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-salmon p-6">
        <h2 className="font-display text-5xl font-bold leading-[1.05] text-white">
          Sip.
          <br />
          Your way.
        </h2>
        <p className="mt-16 max-w-[8rem] text-[0.65rem] font-semibold uppercase tracking-widest">
          Cold drinks. Good days.
        </p>
        <BottleIcon
          color={color}
          className="absolute -right-2 top-6 h-56 rotate-[14deg] drop-shadow-xl"
        />
        <div className="mt-10 flex gap-2">
          <GlassButton size="sm">Save</GlassButton>
          <GlassButton size="sm">Share</GlassButton>
          <GlassButton size="sm">Color</GlassButton>
        </div>
      </section>

      <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-plum/60">
        New · 1/4
      </p>
      <h3 className="font-display text-2xl font-bold">Owala FreeSip 24 oz</h3>
      <p className="mt-1 text-sm">EGP 1,450</p>

      <div className="mt-3 flex gap-2.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full ${color === c ? 'ring-2 ring-plum ring-offset-2 ring-offset-cream' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="mt-6">
        <GlassButton variant="plum" size="lg" full>
          Add to cart
        </GlassButton>
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
