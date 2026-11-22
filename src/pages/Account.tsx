import { useNavigate } from 'react-router-dom'
import GlassButton from '../components/GlassButton'
import { useSettings } from '../hooks/useSettings'

/** Starter Account screen. Login, rewards, and addresses come in Step 5. */
export default function Account() {
  const navigate = useNavigate()
  const settings = useSettings()
  const whatsapp = settings ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}` : null

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Account</h1>

      <section className="mt-4 rounded-[1.75rem] bg-lavender p-5">
        <p className="font-display text-lg font-bold">Login is coming soon</p>
        <p className="mt-1 text-sm text-plum/70">Rewards, addresses, and settings will be here (Step 5).</p>
      </section>

      <div className="mt-4 space-y-3">
        <GlassButton full onClick={() => navigate('/orders')}>
          My orders
        </GlassButton>
        {whatsapp && (
          <GlassButton variant="mint" full onClick={() => window.open(whatsapp, '_blank', 'noopener')}>
            WhatsApp us
          </GlassButton>
        )}
      </div>
    </>
  )
}
