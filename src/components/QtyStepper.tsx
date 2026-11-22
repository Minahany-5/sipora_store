import GlassButton from './GlassButton'

interface QtyStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/** − 2 +  with glass buttons */
export default function QtyStepper({ value, onChange, min = 1, max = 20 }: QtyStepperProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <GlassButton size="icon" aria-label="One less" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </GlassButton>
      <span className="w-6 text-center text-base font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <GlassButton size="icon" aria-label="One more" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </GlassButton>
    </div>
  )
}
