export type Tab = 'home' | 'discover' | 'bag' | 'account'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'discover', label: 'Discover' },
  { id: 'bag', label: 'Bag' },
  { id: 'account', label: 'Account' },
]

interface BottomNavProps {
  active: Tab
  onChange?: (tab: Tab) => void
}

/** Glass pill navigation, fixed to the bottom of the phone screen. */
export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      aria-label="Main"
    >
      <div className="glass-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange?.(t.id)}
            className={`flex-1 rounded-full py-2.5 text-xs font-semibold transition ${
              active === t.id ? 'bg-plum text-white shadow-md' : 'text-plum/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
