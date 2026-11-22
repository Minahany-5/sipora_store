import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDeps } from './deps.js'

try {
  const config = loadConfig()
  const app = createApp(createDeps(config))
  app.listen(config.port, () => {
    console.log(`Sipora server is running: http://localhost:${config.port}  (try /health)`)
    if (!config.resendApiKey) console.log('Emails are OFF (no RESEND_API_KEY). Orders still work.')
  })
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
