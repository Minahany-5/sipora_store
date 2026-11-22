import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

/** An error with an HTTP status. The message is safe to show to the customer. */
export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg)
export const notFound = (msg = 'Not found') => new HttpError(404, msg)
export const conflict = (msg: string) => new HttpError(409, msg)

/** Last middleware: turns errors into a simple JSON answer. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'The request is not valid.', details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) })
    return
  }
  // Bad JSON in the body, body too big, etc. (these have a status from the body parser)
  const status = (err as { status?: number })?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: 'The request is not valid.' })
    return
  }
  console.error('[server error]', err instanceof Error ? err.message : err)
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
}
