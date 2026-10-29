# LutongPinoy 🍲 — Next.js Filipino meal planner PWA

A responsive, installable **Progressive Web App** made with **Next.js App Router, React and TypeScript**. It comes with 106 built-in Filipino recipes, photos, ingredients and cooking instructions; rotating daily, weekly and monthly meal plans; shopping lists; meal swapping; favorites; family-size scaling; dietary preferences; and custom recipes.

## Run locally

Requires Node.js 20.9 or newer (22 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000. A PWA requires HTTPS for installation outside `localhost`.

## Deploy to GitHub Pages

1. Create a **public** GitHub repository (for example `lutongpinoy`).
2. Upload or push all project files to the repository's `main` branch.
3. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The included `.github/workflows/deploy.yml` automatically builds and publishes on pushes to `main`.
5. Open `https://YOUR-USERNAME.github.io/lutongpinoy/` (using your actual repository name).

For GitHub Pages, the workflow sets `NEXT_PUBLIC_BASE_PATH` to the repository name before building. Static-export mode means no Node server or database is needed in production.

## Deploy to Vercel instead

Import the repository in Vercel; it will detect Next.js. Keep `NEXT_PUBLIC_BASE_PATH` empty or unset. The `output: 'export'` setting is compatible with Vercel static hosting.

## Install as an app (PWA)

- **Android Chrome:** Visit the HTTPS site → browser menu → **Install app** or **Add to Home screen**.
- **iPhone Safari:** Share → **Add to Home Screen**.
- **Desktop Chrome/Edge:** Use the install icon in the address bar when offered.

The included web manifest and service worker support home-screen installation and caching for previously visited content. Visit the site online once before relying on it offline. Changes, favorites and custom recipes are stored on the **current device only** using localStorage; they do not sync across devices.

## Data and food images

- 106 preloaded original summarized Filipino recipes in `lib/recipes.json`.
- Twelve illustrative food photos are bundled locally in `public/photos/` for quick loading and offline reuse. The photos illustrate dish categories and may not show each recipe exactly.
- Menu rotation is deterministic across dates and recipes. Meal swaps override the generated choice only for that date and meal.
- Grocery quantities aggregate per-recipe ingredients and scale from recipes written for 4 portions. They are estimates, not exact nutritional or food-safety advice.

## Commands

- `npm run dev` — development server
- `npm run build` — static export to `out/`
- `npm run lint` — TypeScript type check

## Cooking references

- https://panlasangpinoy.com/
- https://www.kawalingpinoy.com/

Recipes here are independently written summaries, not copied articles. Taste, quantities and cooking times can vary by ingredient size and local preference.
