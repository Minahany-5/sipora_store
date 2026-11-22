/** 1350 -> "EGP 1,350" */
export function formatEGP(amount: number): string {
  return `EGP ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

/** 2 -> "2nd", 3 -> "3rd" */
export function ordinal(n: number): string {
  const rest100 = n % 100
  if (rest100 >= 11 && rest100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
