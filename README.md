# Sipora

Online store for **Owala bottles** in Cairo, Egypt. "Find your own Owala."

- Website: React + TypeScript + Tailwind CSS v4 + Vite (this folder)
- Server: Node.js + Express + TypeScript (`server/`)
- Database, login and photos: Supabase (PostgreSQL, Auth, Storage)
- Emails: Resend. Hosting: Vercel (Step 8).

## Folders

| Folder | What is inside |
| --- | --- |
| `src/` | The website (screens, components, login, bag, checkout) |
| `server/` | The Node.js server: orders, loyalty discount, Instapay approval, emails |
| `supabase/` | SQL for the database, the 6 products, and their photos |
| `docs/` | Notes for each step |

## Run it on your computer

You need Node.js 20 or newer.

1. Database (once): in Supabase > SQL Editor run, in this order:
   `supabase/schema.sql`, then upload the photos in `supabase/product-images/` to the
   `product-images` bucket, then `supabase/seed-products.sql`, then `server/sql/step4.sql`.
2. Website `.env` (copy `.env.example` to `.env` and fill it):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
3. Server `.env` (in `server/`, copy `.env.example` to `.env` and fill it):
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (the SECRET key)
4. Start:

       npm install
       npm run check        # tests your files, .env, tables, photos and the server
       npm run dev          # the website

       cd server
       npm install
       npm run dev          # the server (second window)
       npm run smoke        # safe test of the whole order flow (makes and deletes test data)

## Security

- `.env` files are in `.gitignore`. **Never commit them.**
- The Supabase SECRET key lives only in `server/.env`. The website uses only the anon key.
- Row Level Security is ON for every table. Prices are always read from the database by the server.

## Progress

- [x] Step 1: project setup
- [x] Step 2: Supabase database, security rules, photo buckets, real products
- [x] Step 3: Discover, Product, Bag, Orders
- [x] Step 4: Node.js server (orders, loyalty discount, Instapay approval, emails)
- [x] Step 5: login, sign up, password reset, Account screen, real Checkout
- [ ] Step 6: admin dashboard
- [ ] Step 7: reviews, blog, translate button, dark mode, map picker, PWA, SEO, analytics, loader
- [ ] Step 8: deploy to Vercel, testing checklist, full code explanation
