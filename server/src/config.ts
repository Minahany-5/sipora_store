import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be your Project URL, like https://abcd.supabase.co'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is missing'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Sipora <onboarding@resend.dev>'),
  ADMIN_EMAIL: z.string().default(''),
  ORDER_RATE_LIMIT: z.coerce.number().int().positive().default(20),
})

export interface Config {
  port: number
  supabaseUrl: string
  supabaseServiceKey: string
  /** websites that may call this server */
  allowedOrigins: string[]
  resendApiKey: string
  emailFrom: string
  adminEmail: string
  /** max orders one internet address can place in 15 minutes */
  orderRateLimit: number
}

/** Reads the settings from the environment (.env). Stops with a clear message if something is wrong. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    throw new Error(`Your server .env file has problems:\n${lines.join('\n')}`)
  }
  const e = parsed.data

  if (e.SUPABASE_URL.includes('YOUR-PROJECT') || e.SUPABASE_SERVICE_KEY.includes('YOUR-SECRET')) {
    throw new Error('Your server .env still has the example text. Paste your real Supabase URL and SECRET key.')
  }
  if (e.SUPABASE_SERVICE_KEY.length < 20) {
    throw new Error('SUPABASE_SERVICE_KEY looks too short. Copy the whole SECRET key from Supabase.')
  }
  if (e.SUPABASE_SERVICE_KEY.startsWith('sb_publishable_') || keyRole(e.SUPABASE_SERVICE_KEY) === 'anon') {
    throw new Error(
      'SUPABASE_SERVICE_KEY is the anon (public) key. The server needs the SECRET key (service_role / "secret").',
    )
  }

  return {
    port: e.PORT,
    supabaseUrl: e.SUPABASE_URL.replace(/\/+$/, ''),
    supabaseServiceKey: e.SUPABASE_SERVICE_KEY,
    allowedOrigins: e.FRONTEND_URL.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
    resendApiKey: e.RESEND_API_KEY,
    emailFrom: e.EMAIL_FROM,
    adminEmail: e.ADMIN_EMAIL,
    orderRateLimit: e.ORDER_RATE_LIMIT,
  }
}

function keyRole(key: string): string | null {
  try {
    const payload = key.split('.')[1]
    if (!payload) return null
    return (JSON.parse(Buffer.from(payload, 'base64url').toString()) as { role?: string }).role ?? null
  } catch {
    return null
  }
}
