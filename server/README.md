# Sipora server (Step 4)

This is the backend of Sipora. It does the jobs that must NOT happen in the browser:

- creates orders with the REAL prices from the database (the website never sends a price)
- gives the loyalty discount on the 3rd order (25% = the number in `store_settings`)
- handles Instapay: the customer sends a reference or a screenshot, you approve or reject it
- moves orders: confirmed -> preparing -> out for delivery -> completed (or cancelled)
- sends emails with Resend

## 1. Set up (one time)

1. Supabase > SQL Editor > New query: paste `sql/step4.sql` > Run. (Only once.)
2. Open PowerShell in the `server` folder and run:

       npm install
       Copy-Item .env.example .env

3. Open `server/.env` and fill it:
   - `SUPABASE_URL` = your Project URL (same as in the website `.env`)
   - `SUPABASE_ANON_KEY` = your anon key (same as in the website `.env`)
   - `SUPABASE_SERVICE_KEY` = your SECRET key. Find it in Supabase > Project Settings > API Keys
     (the "service_role" key, or the "Secret key" that starts with `sb_secret_`).
     This key is a master key. Never put it in the website. Never send it to anyone. Never put it in Git.
   - Leave `RESEND_API_KEY` empty for now. Orders work without emails.

## 2. Run it

       npm run dev

Open http://localhost:3001/health. You should see `{"ok":true,"service":"sipora-server"}`.

## 3. Test it (safe)

Open a second PowerShell window in the `server` folder:

       npm run smoke

It makes 2 test users, places test orders, approves them, checks the 25% discount,
and then deletes everything it made. You should see ✅ on every line.

## The API

All routes need a login token: `Authorization: Bearer <token>`.
The token is `session.access_token` from Supabase Auth (login comes in Step 5).

| Who | Method and path | What it does |
| --- | --- | --- |
| Customer | `POST /api/orders` | Place an order. Body below. |
| Customer | `POST /api/orders/:id/payment-proof` | Add or change the Instapay reference or screenshot. |
| Customer | `POST /api/orders/:id/cancel` | Cancel an order that is still waiting. |
| Staff | `POST /api/admin/payments/:id/approve` | Approve an Instapay payment. The order becomes confirmed. |
| Staff | `POST /api/admin/payments/:id/reject` | Reject it. Body: `{ "note": "..." }` (optional). |
| Staff | `POST /api/admin/orders/:id/status` | Body: `{ "status": "confirmed" \| "preparing" \| "out_for_delivery" \| "completed" \| "cancelled" }` |

Place an order (no prices in the body):

    {
      "items": [{ "productId": "uuid", "sizeId": "uuid", "quantity": 1 }],
      "paymentMethod": "cod",                      // or "instapay"
      "customer": { "name": "Mina", "phone": "01012345678" },
      "address": { "text": "12 Street, Nasr City, Cairo", "latitude": 30.05, "longitude": 31.34 },
      "notes": "Call me first",                    // optional
      "instapayReference": "ABC12345",             // Instapay: this OR screenshotPath
      "screenshotPath": "<user-id>/proof.png"      // file in the "payment-screenshots" bucket
    }

Answers: `201 { order: { id, orderNumber, subtotal, discount, deliveryFee, total, loyaltyApplied } }`
or an error `{ "error": "simple message" }` with status 400 (bad data), 401 (not logged in),
403 (not staff), 404, 409 (conflict, for example out of stock) or 429 (too many orders).

## Rules the server enforces

- Prices, delivery fee and discount come from the database, never from the browser.
- Only ONE open order at a time can use the loyalty discount. Cancelling it gives the discount back.
- The same Instapay reference cannot be used twice.
- An Instapay order cannot move on before you approve the payment.
- Orders only move forward. Finished orders (completed, cancelled) cannot change.
- A customer can cancel only while the order is "pending".
- Staff role is read from the database. Customers cannot call admin routes.
- Emails never stop an order. If an email fails, the order is still saved.
- The website address in `FRONTEND_URL` is the only website allowed to call this server from a browser.

## Emails (Resend)

Add your key to `RESEND_API_KEY` when you are ready. With the free test sender
(`onboarding@resend.dev`) Resend sends only to YOUR OWN email. To email customers you need to
verify your own domain in Resend (we do this in Step 8).

## Files

    src/config.ts        reads and checks .env
    src/app.ts           the web server (security, CORS, limits)
    src/routes-orders.ts customer routes
    src/routes-admin.ts  staff routes
    src/auth.ts          login token and role checks
    src/emails.ts        Resend and the email texts
    src/schemas.ts       checks the data from the website
    sql/step4.sql        the create_order function (run in Supabase)
    scripts/smoke-test.ts  the safe test (npm run smoke)
    api/index.ts + vercel.json  used when we deploy to Vercel (Step 8)
