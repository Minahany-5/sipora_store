import GlassButton from './GlassButton'

interface ErrorBoxProps {
  message: string
  onRetry: () => void
}

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div role="alert" className="rounded-[1.75rem] bg-rose p-5">
      <p className="font-display text-lg font-bold">We could not load this.</p>
      <p className="mt-1 text-sm text-plum/80">
        Check your internet and your <code>.env</code> file. ({message})
      </p>
      <div className="mt-3">
        <GlassButton size="sm" onClick={onRetry}>
          Try again
        </GlassButton>
      </div>
    </div>
  )
}
