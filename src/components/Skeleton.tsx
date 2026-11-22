/** Grey pulsing boxes shown while products load. */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[1.75rem] bg-plum/10 ${className}`} aria-hidden="true" />
}
