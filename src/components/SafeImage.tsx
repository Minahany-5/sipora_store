import { useState } from 'react'
import BottleIcon from './BottleIcon'

interface SafeImageProps {
  src: string | null
  alt: string
  className?: string
  priority?: boolean
  /** color of the bottle drawing that shows when the photo cannot load */
  fallbackColor?: string
}

/** A photo. If the file is missing (404), it shows the bottle drawing instead of a broken picture. */
export default function SafeImage({ src, alt, className = '', priority = false, fallbackColor }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return <BottleIcon color={fallbackColor} className={className} />
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        console.warn(`[Sipora] Image not found: ${src}`)
        setFailedSrc(src)
      }}
    />
  )
}
