import type { Config } from './config.js'
import { createMailer } from './emails.js'
import { createAdminClient } from './supabase.js'
import type { Deps } from './types.js'

/** Connects the real services: Supabase and Resend. */
export function createDeps(config: Config): Deps {
  const db = createAdminClient(config)
  return {
    config,
    db,
    mailer: createMailer(config),
    async verifyToken(token) {
      const { data, error } = await db.auth.getUser(token)
      if (error || !data.user) return null
      return { id: data.user.id, email: data.user.email ?? null }
    },
    async getUserEmail(userId) {
      const { data, error } = await db.auth.admin.getUserById(userId)
      if (error) return null
      return data.user?.email ?? null
    },
    async screenshotExists(path) {
      const slash = path.lastIndexOf('/')
      const folder = path.slice(0, slash)
      const name = path.slice(slash + 1)
      const { data, error } = await db.storage.from('payment-screenshots').list(folder, { search: name, limit: 10 })
      if (error) return false
      return (data ?? []).some((f) => f.name === name)
    },
  }
}
