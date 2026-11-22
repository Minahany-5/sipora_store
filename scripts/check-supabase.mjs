// Run:  npm run check
// It checks your project files, your .env file, your Supabase tables, and your product images.
// It only uses the PUBLIC (anon) key, like the website does. It never changes any data.

import { existsSync, readFileSync } from 'node:fs'

let failures = 0
const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg, fix) => {
  failures += 1
  console.log(`  ❌ ${msg}`)
  if (fix) console.log(`     → ${fix}`)
}
const title = (msg) => console.log(`\n${msg}`)

// ---------- 1. Project files ----------
title('1. Step 3 files')
const needed = [
  'src/App.tsx',
  'src/cart/CartProvider.tsx',
  'src/components/Layout.tsx',
  'src/pages/Discover.tsx',
  'src/pages/ProductPage.tsx',
  'src/pages/Cart.tsx',
  'src/pages/Orders.tsx',
  'src/lib/products.ts',
]
const missing = needed.filter((f) => !existsSync(f))
if (missing.length === 0) {
  ok('All Step 3 files are in place')
} else {
  fail(
    `Missing files: ${missing.join(', ')}`,
    'You may have unzipped into a sub-folder (sipora/sipora/src). Copy the files from the zip so they land in THIS folder.',
  )
}
if (existsSync('src/App.tsx') && !readFileSync('src/App.tsx', 'utf8').includes('CartProvider')) {
  fail('src/App.tsx is still the old Step 1 file', 'Replace src/App.tsx with the one from the Step 3 zip.')
}

// ---------- 2. .env ----------
title('2. .env file')
const env = {}
if (!existsSync('.env')) {
  fail('There is no .env file', 'Copy .env.example to .env, then paste your Supabase URL and anon key.')
} else {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const url = (env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const key = env.VITE_SUPABASE_ANON_KEY ?? ''

function keyRole(k) {
  try {
    return JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString()).role
  } catch {
    return null
  }
}

let envOk = false
if (existsSync('.env')) {
  if (!url) fail('VITE_SUPABASE_URL is missing or empty', 'The name must be exactly VITE_SUPABASE_URL (with VITE_ at the start).')
  else if (!/^https?:\/\//.test(url)) fail('VITE_SUPABASE_URL must start with https://')
  else if (url.includes('YOUR-PROJECT')) fail('VITE_SUPABASE_URL still has the example text', 'Paste your real Project URL.')
  else if (url.includes('/rest/v1')) fail('VITE_SUPABASE_URL must be only the Project URL', 'Remove /rest/v1 from the end.')
  else ok(`VITE_SUPABASE_URL = ${url}`)

  if (!key) fail('VITE_SUPABASE_ANON_KEY is missing or empty', 'The name must be exactly VITE_SUPABASE_ANON_KEY.')
  else if (key.includes('YOUR-ANON')) fail('VITE_SUPABASE_ANON_KEY still has the example text')
  else if (key.startsWith('sb_secret_') || keyRole(key) === 'service_role')
    fail('This is a SECRET key. Never put it in the website.', 'Use the anon / publishable key. Change it, and rotate the secret key in Supabase.')
  else ok('VITE_SUPABASE_ANON_KEY is set (not a secret key)')

  envOk =
    /^https?:\/\//.test(url) &&
    !url.includes('YOUR-PROJECT') &&
    !url.includes('/rest/v1') &&
    !!key &&
    !key.includes('YOUR-ANON') &&
    !key.startsWith('sb_secret_') &&
    keyRole(key) !== 'service_role'
}

if (!envOk) {
  console.log('\nFix the .env problems above, then run: npm run check')
  process.exit(1)
}

// ---------- 3. Supabase tables ----------
const headers = { apikey: key, Authorization: `Bearer ${key}` }

async function rest(path) {
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(15000) })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    return { status: res.status, body }
  } catch (err) {
    return { status: 0, body: String(err?.cause?.code ?? err?.message ?? err) }
  }
}

function explain(r, table) {
  if (r.status === 0)
    return `Cannot reach Supabase (${r.body}). Check the URL and your internet.`
  const code = r.body?.code
  if (r.status === 401 || r.status === 403 || r.body?.message === 'Invalid API key')
    return 'Supabase refused the key. Copy the anon key again from Project Settings → API.'
  if (code === 'PGRST205' || code === '42P01')
    return `The table "${table}" does not exist. Run schema.sql in the Supabase SQL Editor (Step 2).`
  if (code === '42703' || code === 'PGRST200')
    return `A column or link is missing in "${table}". Run schema.sql again on a fresh project (or ask me).`
  if (code === '42501') return `No permission to read "${table}". The RLS rules from schema.sql are missing.`
  return `${r.status}: ${r.body?.message ?? JSON.stringify(r.body)}`
}

title('3. Supabase tables (read as a visitor)')
const products = await rest('products?select=id,slug,name,is_active,product_colors(id),product_sizes(id),product_images(path)&is_active=eq.true')
let imagePaths = []
if (!Array.isArray(products.body)) {
  fail(`products: ${explain(products, 'products')}`)
} else if (products.body.length === 0) {
  fail(
    'products: connected, but there are 0 active products',
    'Run seed-products.sql in the Supabase SQL Editor. If you already ran it, check that is_active is true.',
  )
} else {
  ok(`products: ${products.body.length} active products`)
  for (const p of products.body) {
    const issues = []
    if (p.product_colors.length === 0) issues.push('no color')
    if (p.product_sizes.length === 0) issues.push('no sizes')
    if (p.product_images.length === 0) issues.push('no image row')
    if (issues.length) fail(`${p.name}: ${issues.join(', ')}`, 'Run the D, E and F parts of seed-products.sql.')
    imagePaths.push(...p.product_images.map((i) => ({ name: p.name, path: i.path })))
  }
}

const settings = await rest('store_settings?select=delivery_fee_egp,loyalty_discount_percent,loyalty_orders_required&id=eq.1')
if (Array.isArray(settings.body) && settings.body.length === 1) {
  const s = settings.body[0]
  ok(`store_settings: delivery ${s.delivery_fee_egp} EGP, loyalty ${s.loyalty_discount_percent}% on order ${s.loyalty_orders_required}`)
} else {
  fail(`store_settings: ${Array.isArray(settings.body) ? 'no row with id = 1' : explain(settings, 'store_settings')}`)
}

for (const t of ['orders', 'profiles']) {
  const r = await rest(`${t}?select=id&limit=1`)
  if (Array.isArray(r.body) && r.body.length === 0) ok(`${t}: a visitor sees nothing (this is correct)`)
  else if (Array.isArray(r.body)) fail(`${t}: a visitor can read rows!`, 'RLS is wrong. Run the RLS part of schema.sql again.')
  else fail(`${t}: ${explain(r, t)}`)
}

// ---------- 4. Images ----------
title('4. Product images (bucket "product-images")')
if (imagePaths.length === 0) {
  console.log('  (no image rows to check)')
}
for (const { name, path } of imagePaths) {
  const imgUrl = `${url}/storage/v1/object/public/product-images/${path.split('/').map(encodeURIComponent).join('/')}`
  try {
    const res = await fetch(imgUrl, { signal: AbortSignal.timeout(15000) })
    const type = res.headers.get('content-type') ?? ''
    await res.body?.cancel() // we only need the status, not the picture
    if (res.ok && type.startsWith('image/')) ok(`${path} (${name})`)
    else
      fail(
        `${path} (${name}): not found (HTTP ${res.status})`,
        'In Supabase → Storage → product-images, upload this file with EXACTLY this name. The bucket must be public.',
      )
  } catch (err) {
    fail(`${path}: ${err?.message ?? err}`)
  }
}

// ---------- 5. The Node server ----------
title('5. Sipora server (the "server" folder)')
const apiUrl = (env.VITE_API_URL ?? '').replace(/\/+$/, '')
if (!apiUrl) {
  fail('VITE_API_URL is missing in .env', 'Add this line to .env:  VITE_API_URL=http://localhost:3001')
} else {
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.ok) ok(`The server answers at ${apiUrl}`)
    else fail(`The server at ${apiUrl} answered, but it is not the Sipora server (HTTP ${res.status})`)
  } catch {
    fail(
      `Cannot reach the server at ${apiUrl}`,
      'Open a second PowerShell window, go to the server folder, and run: npm run dev   (needed for checkout)',
    )
  }
}

title(failures === 0 ? '🎉 Everything is OK. Run: npm run dev' : `Found ${failures} problem(s). Fix the ❌ lines, then run: npm run check`)
process.exit(failures === 0 ? 0 : 1)
