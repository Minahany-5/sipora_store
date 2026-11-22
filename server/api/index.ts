// Vercel entry (used in Step 8). Vercel runs this file for every request.
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { createDeps } from '../src/deps.js'

export default createApp(createDeps(loadConfig()))
