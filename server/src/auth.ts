import type { NextFunction, Request, Response } from 'express'
import { HttpError } from './http.js'
import type { AuthUser, Deps } from './types.js'

export const currentUser = (res: Response): AuthUser => res.locals.user as AuthUser

/** Reads "Authorization: Bearer <login token>" and asks Supabase who it is. */
async function authenticate(deps: Deps, req: Request): Promise<AuthUser> {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new HttpError(401, 'Please log in first.')
  const user = await deps.verifyToken(token)
  if (!user) throw new HttpError(401, 'Your login is not valid. Please log in again.')
  return user
}

/** The website must send a valid login token. */
export function requireUser(deps: Deps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.locals.user = await authenticate(deps, req)
    next()
  }
}

/** Only admin and staff can pass. The role is read from the database, never from the website. */
export function requireStaff(deps: Deps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await authenticate(deps, req)
    const { data, error } = await deps.db.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (error) throw error
    if (!data || (data.role !== 'admin' && data.role !== 'staff')) {
      throw new HttpError(403, 'Only the store team can do this.')
    }
    res.locals.user = user
    next()
  }
}
