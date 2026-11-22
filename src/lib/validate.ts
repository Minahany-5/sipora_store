// The same rules as the server (server/src/schemas.ts), so people see the problem before they send.

const EG_MOBILE = /^(?:\+20|0020|20|0)?1[0125]\d{8}$/

export function isEgyptianMobile(value: string): boolean {
  return EG_MOBILE.test(value.replace(/[\s-]/g, ''))
}

export function isValidReference(value: string): boolean {
  return /^[A-Za-z0-9_-]{4,40}$/.test(value.trim())
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
