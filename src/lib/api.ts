import { supabase } from './supabase'

/** The address of the Node server (the "server" folder). */
const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')
const API_URL = raw.trim().replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST'
  body?: unknown
}

/** Calls the Sipora server and sends the login token. Throws ApiError with a simple message. */
export async function api<T>(path: string, { method = 'GET', body }: ApiOptions = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'The server address is missing. Set VITE_API_URL in the .env file.')

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'We cannot reach the server. Check your internet and try again.')
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* the answer has no body */
  }

  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? 'Something went wrong. Please try again.'
    throw new ApiError(res.status, message)
  }
  return json as T
}
