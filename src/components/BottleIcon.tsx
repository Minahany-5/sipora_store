interface BottleIconProps {
  color?: string
  className?: string
}

/** Simple illustrated bottle. Pass any colour for the water/body. */
export default function BottleIcon({ color = '#2fb5a3', className = '' }: BottleIconProps) {
  return (
    <svg viewBox="0 0 80 160" className={className} role="img" aria-label="Sipora bottle">
      <rect x="22" y="4" width="36" height="16" rx="8" fill="#4a1f28" />
      <path
        d="M16 28h48a8 8 0 0 1 8 8v100a16 16 0 0 1-16 16H24a16 16 0 0 1-16-16V36a8 8 0 0 1 8-8z"
        fill="#ffffff"
        fillOpacity="0.55"
        stroke="#4a1f28"
        strokeWidth="3"
      />
      <path
        d="M11 92c14-10 22 8 36 0s18-3 22-3v47a13 13 0 0 1-13 13H24a13 13 0 0 1-13-13z"
        fill={color}
        stroke="#4a1f28"
        strokeWidth="2.5"
      />
    </svg>
  )
}
