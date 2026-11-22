import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { errorHandler } from './http.js'
import { adminRouter } from './routes-admin.js'
import { ordersRouter } from './routes-orders.js'
import type { Deps } from './types.js'

export function createApp(deps: Deps) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // we are behind Vercel's proxy

  app.use(helmet())
  app.use(
    cors({
      // Only your website may call this server from a browser.
      origin: (origin, cb) => cb(null, !origin || deps.config.allowedOrigins.includes(origin)),
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  )
  app.use(express.json({ limit: '20kb' }))
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'sipora-server' })
  })
  app.use('/api/orders', ordersRouter(deps))
  app.use('/api/admin', adminRouter(deps))

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })
  app.use(errorHandler)
  return app
}
