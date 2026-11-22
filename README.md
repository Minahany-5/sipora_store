# Sipora – Step 1: Project Setup

Luxury Owala bottle store for Cairo.
Stack: **React + TypeScript + Tailwind CSS v4 + Vite**, **Supabase** (Postgres), deployed on **Vercel**.

## 1. What you need installed (one time)
1. **Node.js 20 or newer** – https://nodejs.org (choose "LTS"). Check: `node -v`
2. **VS Code** – https://code.visualstudio.com
3. **Git** – https://git-scm.com  (you already know Git)
4. Recommended VS Code extensions: *Tailwind CSS IntelliSense*, *ESLint/Oxc*, *Prettier*.

## 2. Run the project
Open the `sipora` folder in VS Code, then open the terminal (Ctrl + `) and run:

```bash
npm install        # downloads the libraries (only the first time)
npm run dev        # starts the site
```

Open the link it prints (usually http://localhost:5173).
Tip: on your phone, use the "Network" link on the same Wi-Fi to see the mobile view.

Other commands:

| Command           | What it does                                   |
|-------------------|------------------------------------------------|
| `npm run dev`     | Start the site while you work                  |
| `npm run build`   | Check types and make the production version    |
| `npm run preview` | Preview the production version                 |
| `npm run lint`    | Find code mistakes                             |

## 3. Folder structure

```
sipora/
├─ index.html               Page shell + Google Fonts (Fraunces, Inter)
├─ vite.config.ts           Vite + React + Tailwind plugins
├─ .env.example             Copy to .env and add Supabase keys (step 2)
├─ public/                  Static files (favicon, later product images)
└─ src/
   ├─ main.tsx              App entry point
   ├─ App.tsx               Root component (router comes in step 3)
   ├─ index.css             Colors, fonts, and the GLASS WATER-DROP buttons
   ├─ components/
   │  ├─ GlassButton.tsx    The glassy button (variants: clear, plum, mint, salmon, rose, lavender)
   │  ├─ BottomNav.tsx      Glass pill navigation (Home, Discover, Bag, Account)
   │  └─ BottleIcon.tsx     Illustrated bottle, any color
   ├─ pages/
   │  └─ Home.tsx           Starter Home screen from the design
   ├─ lib/
   │  └─ supabase.ts        Supabase connection (needs .env)
   └─ types/
      └─ index.ts           Shared TypeScript types
```

## 4. How to use the design tokens
Colors and fonts are set once in `src/index.css` under `@theme`.
Use them as Tailwind classes:

- Colors: `bg-cream`, `text-plum`, `bg-salmon`, `bg-mint`, `bg-rose`, `bg-lime`, `bg-lavender`
- Fonts: `font-display` (Fraunces, titles) and `font-sans` (Inter, text)

## 5. Glass water-drop button

```tsx
import GlassButton from './components/GlassButton'

<GlassButton>Save</GlassButton>                          // clear glass
<GlassButton variant="plum" size="lg" full>Add to cart</GlassButton>
<GlassButton variant="mint" size="sm">WhatsApp</GlassButton>
```

To make a new color, add a class in `src/index.css` like `.glass-btn--mint`
(change `--tint` and `--shadow` only).

## 6. Git and GitHub (quick)

```bash
git init
git add .
git commit -m "Step 1: project setup"
# create an empty repo on GitHub named sipora, then:
git remote add origin https://github.com/YOUR-USERNAME/sipora.git
git branch -M main
git push -u origin main
```

The `.env` file is ignored by Git on purpose (it holds secret keys). Never upload it.

## 7. What comes next
- **Step 2:** Supabase tables (products, customers, carts, orders, loyalty) and security rules.
- **Step 3:** Discover, Product, Cart, and Order screens connected to the database.
