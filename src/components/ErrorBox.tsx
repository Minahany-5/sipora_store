import GlassButton from './GlassButton'

interface ErrorBoxProps {
  message: string
  onRetry: () => void
}

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div role="alert" className="rounded-[1.75rem] bg-rose p-5">
      <p className="font-display text-lg font-bold">We could not load this.</p>
      <p className="mt-1 text-sm text-plum/80">{message}</p>
      <p className="mt-2 text-xs text-plum/60">
        Tip: after you change the .env file, stop the site (Ctrl + C) and run npm run dev again.
      </p>
      <div className="mt-3">
        <GlassButton size="sm" onClick={onRetry}>
          Try again
        </GlassButton>
      </div>
    </div>
  )
}
