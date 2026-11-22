import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'clear' | 'plum' | 'mint' | 'salmon' | 'rose' | 'lavender'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
  children: ReactNode
}

/** Glassy water-drop button. Styles live in src/index.css (.glass-btn). */
export default function GlassButton({
  variant = 'clear',
  size = 'md',
  full = false,
  className = '',
  children,
  ...rest
}: GlassButtonProps) {
  const classes = [
    'glass-btn',
    variant !== 'clear' && `glass-btn--${variant}`,
    size !== 'md' && `glass-btn--${size}`,
    full && 'glass-btn--full',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...rest}>
      <span>{children}</span>
    </button>
  )
}
