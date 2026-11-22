# Sipora - Step 3 (catalog, product, bag, orders)

## How to add it to your project
1. Close `npm run dev` if it is running.
2. Copy the files from this zip into your `sipora` folder. Say "yes" when your computer asks to replace files.
3. Make sure your `.env` file has your Supabase URL and anon key (from Supabase > Project Settings > API).
4. Run:
   npm install
   npm run dev
5. Open the address on your phone or in Chrome (phone size: press F12, then the phone icon).

## Files changed (replaced)
- src/App.tsx
- src/pages/Home.tsx
- src/components/BottomNav.tsx   (new: small badge with the number of items in the bag)
- src/types/index.ts

## Files added
- src/components/: Layout, QtyStepper, PriceTag, ProductImage, ProductCard, Skeleton, ErrorBox
- src/pages/: Discover, ProductPage, Cart, Orders, Account, Checkout
- src/cart/: CartContext.ts, CartProvider.tsx, useCart.ts
- src/hooks/: useProducts, useSettings, useSession, useLoyalty
- src/lib/: format.ts, products.ts, settings.ts

## Not changed
GlassButton, BottleIcon, supabase.ts, index.css, main.tsx

## Notes
- The bag is saved on the phone (localStorage), so people can shop before login.
- Prices in the bag are only a preview. The backend checks the real price in Step 4.
- Orders and the loyalty card need a logged-in user. Login comes in Step 5.
