# 🍬 Sweet Pop (candy-crush-clone)

A candy-matching puzzle game built with plain HTML, CSS and JavaScript (canvas). It is a **Progressive Web App**: install it on your phone's home screen and play fullscreen, even offline.

## Features
- Swap-3 matching with cascades, 20 levels (score, collect, jelly and lucky-gem goals)
- Special candies: striped, bomb, colour bomb, Cross Jewel, Bonus Jewel drops
- Boosters (Hammer, Shuffle, Rainbow), coins, shop and a 7-day Daily Gift
- Touch-first controls (swipe or tap-tap), sound and haptics, progress saved on the device
- Installable and offline-capable (manifest + service worker)

## Project layout
| File | Purpose |
| --- | --- |
| `index.html` | App shell and PWA meta tags |
| `style.css`, `game.js` | Styles and all game code |
| `manifest.webmanifest` | Install metadata (name, colours, icons) |
| `sw.js` | Service worker: precaches the app, works offline |
| `icons/` | App icons (any, maskable, Apple touch, favicon, SVG source) |
| `vercel.json` | Static hosting headers for Vercel |

There is no build step.

## Run locally
```bash
npm start        # or: python3 -m http.server 3000
```
Open http://localhost:3000. Service workers work on `localhost` and on HTTPS.

## Deploy to Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repo.
2. Framework preset: **Other**. Leave Build Command and Output Directory empty.
3. Deploy. Vercel serves the site over HTTPS, which installing a PWA requires.

Or from the CLI: `npx vercel --prod`.

## Install on your phone
- **Android (Chrome):** open the site and tap **📲 Install** on the menu (or Chrome menu → *Install app*).
- **iPhone/iPad (Safari):** tap **Share → Add to Home Screen**.

## Shipping updates
The service worker caches the app. When you change any file, bump `VERSION` in `sw.js` (e.g. `sweetpop-v3`) so installed copies refresh.
