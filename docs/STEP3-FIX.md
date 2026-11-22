# Sipora Step 3 fix

Unzip so the files land DIRECTLY in your project folder (the folder that has package.json).
There is no sub-folder inside this zip. Say "yes" to replace files.

Then run these commands in the project folder:

    npm run check       (tests your files, .env, Supabase tables and images)
    npm run dev         (stop it first with Ctrl + C if it is running)

If you change .env, ALWAYS stop npm run dev (Ctrl + C) and start it again.

## Changed files
- src/lib/supabase.ts          .env is checked. A wrong .env no longer gives a blank page.
- src/lib/products.ts          stops early with a clear message when .env is wrong
- src/lib/settings.ts          same
- src/hooks/useSettings.ts     now also returns an error
- src/components/ProductImage.tsx   uses SafeImage
- src/components/ErrorBox.tsx  shows the real reason + restart tip
- src/pages/Home.tsx, Discover.tsx, Cart.tsx, Account.tsx
- package.json                 new script: "check"

## New files
- src/components/SafeImage.tsx     missing photo -> bottle drawing (no broken picture)
- src/components/EmptyCatalog.tsx  "No products in the database yet" message
- scripts/check-supabase.mjs       the npm run check command
