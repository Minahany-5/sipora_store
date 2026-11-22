# Sipora Step 5: login, sign up, password reset, Account, Checkout

## A. Put the files in your project
Unzip `sipora-step5.zip` into your project folder (the one with package.json). Say "yes" to replace files.
Your `.env` is NOT in the zip, so it stays safe.

    Expand-Archive -Path "$HOME\Downloads\sipora-step5.zip" -DestinationPath . -Force

## B. Two new lines in your website .env  (project folder, NOT the server folder)

    VITE_API_URL=http://localhost:3001
    VITE_ENABLE_GOOGLE=false

## C. Supabase settings (Authentication menu)
1. URL Configuration:
   - Site URL:      http://localhost:5173
   - Redirect URLs: add   http://localhost:5173/**
   (If your website opens on another port, use that port.)
2. Sign In / Providers > Email:
   - Turn OFF "Confirm email" for now.
   Why: Supabase's own email service sends only to people in YOUR Supabase team, and only a few per hour.
   With "Confirm email" ON, your customers could not finish sign up.
3. Password reset emails have the same limit. Until we add your own email sender (Step 8), the reset link works only
   for an email address that belongs to your Supabase team (for example your own).

## D. Also set the server .env (server folder)
   FRONTEND_URL=http://localhost:5173      (this is already the default)

## E. Run (3 windows)
1) server folder:   npm run dev
2) project folder:  npm run check     (all lines must be ✅, including "5. Sipora server")
3) project folder:  npm run dev

## F. Make yourself admin (once)
Create your own account on the website (Sign up). Then Supabase > SQL Editor > run `make-admin.sql`
(it is in your Step 2 pack). Your Account screen will say "You are signed in as admin".

## G. Google login (optional, later)
Not needed now. Keep VITE_ENABLE_GOOGLE=false. We can add it when you want.

## Test checklist
- [ ] Sign up with a new email. You land on Account and it says "Hi, <your name>".
- [ ] Refresh the page. You are still logged in.
- [ ] Log out and log in again. A wrong password says "Wrong email or password."
- [ ] Account > Add an address. It appears in the list.
- [ ] Add a bottle to the bag > Checkout. Your name and phone are filled in. Your saved address is a button.
- [ ] Cash on delivery: place the order. You see "Thank you!" with the order number. The bag is empty.
- [ ] Orders shows it as "Waiting". "Cancel order" works.
- [ ] Instapay: you see EGP total + 01210033628. Add a reference or a screenshot, place the order.
- [ ] In Supabase > Table Editor > orders / payments you see your test orders. (Delete test orders when you finish.)
