// Run:  npm run smoke      (the server must be running: npm run dev)
//
// It makes 2 TEST users (a customer and an admin) in your Supabase project, places test orders,
// approves them, checks the loyalty discount, and then DELETES everything it made.
// Tip: start the server with an empty RESEND_API_KEY, so no test emails are sent.

import { createClient } from '@supabase/supabase-js'

const url = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? ''
const anonKey = process.env.SUPABASE_ANON_KEY ?? ''
const api = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`

if (!url || !serviceKey || !anonKey || anonKey.includes('YOUR-')) {
  console.error('Please fill SUPABASE_URL, SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY in server/.env')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

let failed = 0
const ok = (msg: string) => console.log(`  ✅ ${msg}`)
const bad = (msg: string) => {
  failed += 1
  console.log(`  ❌ ${msg}`)
}
function check(condition: boolean, good: string, wrong: string) {
  if (condition) ok(good)
  else bad(wrong)
}

async function call(method: string, path: string, token: string | null, body?: unknown) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* no body */
  }
  return { status: res.status, json }
}

const stamp = Date.now().toString(36)
const password = `Test-${stamp}-${Math.random().toString(36).slice(2, 10)}!`
const createdUserIds: string[] = []

async function makeUser(label: string) {
  const email = `sipora-smoke-${label}-${stamp}@example.com`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Smoke ${label}` } })
  if (error || !data.user) throw new Error(`Could not create the ${label} test user: ${error?.message}`)
  createdUserIds.push(data.user.id)
  const { data: session, error: signErr } = await anon.auth.signInWithPassword({ email, password })
  if (signErr || !session.session) throw new Error(`Could not log in the ${label} test user: ${signErr?.message}`)
  return { id: data.user.id, token: session.session.access_token }
}

async function cleanup() {
  console.log('\nCleaning up the test data...')
  for (const id of createdUserIds) {
    const { data: orders } = await admin.from('orders').select('id').eq('user_id', id)
    const ids = (orders ?? []).map((o) => o.id as string)
    if (ids.length) {
      await admin.from('payments').delete().in('order_id', ids)
      await admin.from('order_items').delete().in('order_id', ids)
      await admin.from('orders').delete().in('id', ids)
    }
    await admin.auth.admin.deleteUser(id) // the profile is deleted with the user
  }
  console.log('  done')
}

async function run() {
  console.log(`\nSipora smoke test  (server: ${api})\n`)

  console.log('1. Server')
  const health = await call('GET', '/health', null).catch(() => null)
  check(health?.status === 200, 'Server is running', `Cannot reach the server at ${api}. Run "npm run dev" in another window.`)
  if (health?.status !== 200) return

  console.log('\n2. Test users')
  const customer = await makeUser('customer')
  const boss = await makeUser('admin')
  const { error: roleErr } = await admin.from('profiles').update({ role: 'admin' }).eq('id', boss.id)
  check(!roleErr, 'Made a customer and an admin', `Could not make the admin: ${roleErr?.message}`)

  const { data: settings } = await admin.from('store_settings').select('*').eq('id', 1).single()
  const { data: prod } = await admin
    .from('products')
    .select('id, name, price_egp, product_sizes(id, price_egp, in_stock), product_colors(id, in_stock)')
    .eq('is_active', true)
    .limit(1)
    .single()
  if (!settings || !prod) throw new Error('No store_settings or products found. Run schema.sql and seed-products.sql.')
  const size = (prod.product_sizes as any[]).find((s) => s.in_stock) ?? null
  const unit = Number(size?.price_egp ?? prod.price_egp)
  const delivery = Number(settings.delivery_fee_egp)
  const items = [{ productId: prod.id, sizeId: size?.id ?? null, quantity: 1 }]
  const base = {
    items,
    customer: { name: 'Smoke Test', phone: '01012345678' },
    address: { text: 'Smoke test address, Cairo, Egypt' },
  }
  console.log(`   Product used: ${prod.name} (EGP ${unit}), delivery EGP ${delivery}`)

  console.log('\n3. Rules')
  check((await call('POST', '/api/orders', null, { ...base, paymentMethod: 'cod' })).status === 401, 'No login -> refused (401)', 'An order without login was accepted!')
  check((await call('POST', '/api/orders', customer.token, { ...base, paymentMethod: 'instapay' })).status === 400, 'Instapay without proof -> refused (400)', 'Instapay without proof was accepted!')
  check((await call('POST', '/api/admin/orders/00000000-0000-0000-0000-000000000000/status', customer.token, { status: 'confirmed' })).status === 403, 'Customer cannot use admin routes (403)', 'A customer could reach an admin route!')

  console.log('\n4. Cash on delivery order')
  const cod = await call('POST', '/api/orders', customer.token, { ...base, paymentMethod: 'cod' })
  check(cod.status === 201, `Order #${cod.json?.order?.orderNumber} created`, `COD order failed: ${JSON.stringify(cod.json)}`)
  check(cod.json?.order?.total === unit + delivery, `Total is right: EGP ${cod.json?.order?.total} (price + delivery)`, `Wrong total: ${cod.json?.order?.total}, expected ${unit + delivery}`)

  console.log('\n5. Instapay order')
  const ref = `SMOKE${stamp.toUpperCase()}`
  const insta = await call('POST', '/api/orders', customer.token, { ...base, paymentMethod: 'instapay', instapayReference: ref })
  check(insta.status === 201, `Order #${insta.json?.order?.orderNumber} created (waiting for payment check)`, `Instapay order failed: ${JSON.stringify(insta.json)}`)
  const dup = await call('POST', '/api/orders', customer.token, { ...base, paymentMethod: 'instapay', instapayReference: ref })
  check(dup.status === 409, 'Same Instapay reference again -> refused (409)', `Duplicate reference was not refused (${dup.status})`)

  if (cod.status !== 201 || insta.status !== 201) return

  console.log('\n6. Admin: approve Instapay payment and move orders')
  const { data: pay } = await admin.from('payments').select('id').eq('order_id', insta.json.order.id).single()
  const early = await call('POST', `/api/admin/orders/${insta.json.order.id}/status`, boss.token, { status: 'preparing' })
  check(early.status === 409, 'Order cannot move before the payment is approved (409)', 'Order moved without payment approval!')
  const approve = await call('POST', `/api/admin/payments/${pay?.id}/approve`, boss.token)
  check(approve.status === 200, 'Payment approved -> order confirmed', `Approve failed: ${JSON.stringify(approve.json)}`)
  for (const order of [insta.json.order.id, cod.json.order.id]) {
    for (const status of order === cod.json.order.id ? ['confirmed', 'out_for_delivery', 'completed'] : ['out_for_delivery', 'completed']) {
      const r = await call('POST', `/api/admin/orders/${order}/status`, boss.token, { status })
      if (r.status !== 200) bad(`Could not set ${status}: ${JSON.stringify(r.json)}`)
    }
  }
  const { data: prof } = await admin.from('profiles').select('completed_orders').eq('id', customer.id).single()
  check(prof?.completed_orders === 2, 'Both orders completed. Loyalty count is 2', `Loyalty count is ${prof?.completed_orders}, expected 2`)

  console.log('\n7. Loyalty: the next order is the 3rd')
  const third = await call('POST', '/api/orders', customer.token, { ...base, paymentMethod: 'cod' })
  const percent = Number(settings.loyalty_discount_percent)
  const expectedDiscount = Math.round(unit * percent) / 100
  check(third.json?.order?.loyaltyApplied === true, `Discount applied (${percent}% off)`, `No discount on the 3rd order: ${JSON.stringify(third.json)}`)
  check(third.json?.order?.discount === expectedDiscount, `Discount is EGP ${third.json?.order?.discount}`, `Wrong discount ${third.json?.order?.discount}, expected ${expectedDiscount}`)
  check(third.json?.order?.total === unit - expectedDiscount + delivery, `Total with discount: EGP ${third.json?.order?.total}`, `Wrong total ${third.json?.order?.total}`)

  console.log('\n8. Cancel')
  const cancel = await call('POST', `/api/orders/${third.json.order.id}/cancel`, customer.token)
  check(cancel.status === 200, 'Customer cancelled the waiting order', `Cancel failed: ${JSON.stringify(cancel.json)}`)
}

try {
  await run()
} catch (err) {
  bad(err instanceof Error ? err.message : String(err))
} finally {
  await cleanup().catch((e) => console.log(`  Cleanup problem: ${e instanceof Error ? e.message : e}`))
}

console.log(failed === 0 ? '\n🎉 Everything is OK.\n' : `\nFound ${failed} problem(s). Fix the ❌ lines and run again.\n`)
process.exit(failed === 0 ? 0 : 1)
