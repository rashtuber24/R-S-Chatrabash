# RS Chatrabash — মেস মনিটরিং ও ভাড়া ব্যবস্থাপনা

A mobile-first, installable Progressive Web App for managing mess rent on a
**postpaid** basis (this month's collection pays last month's rent). All data
is stored locally on the device (localStorage) — no backend, no server, no
internet required after first load.

## Files
- `index.html` — app shell
- `styles.css` — teal/green mobile-first theme
- `app.js` — all application logic (data, accounting engine, views)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline caching)
- `icon-192.png`, `icon-512.png` — app icons

## Run locally
You need a static file server (service workers require http/https, not `file://`).

**Option A — Python:**
```
cd rs-chatrabash
python3 -m http.server 8080
```
Open `http://localhost:8080` in Chrome.

**Option B — Node:**
```
npx serve .
```

## Install as an app (Android/Chrome)
1. Open the site in Chrome on your phone.
2. Tap the menu (⋮) → "Add to Home screen" / "Install app".
3. Launch it from your home screen — it now works fully offline.

## Deploy to GitHub Pages
1. Create a new GitHub repository, e.g. `rs-chatrabash`.
2. Push all files in this folder to the repository root (or to `/docs` if you
   prefer, then set that as the Pages source).
3. In the repo settings → **Pages**, set the source to the branch/folder
   containing these files.
4. Your app will be live at:
   `https://<your-username>.github.io/rs-chatrabash/`

All internal links use **relative paths** (`./manifest.json`, `./sw.js`, etc.)
so the app works correctly under a GitHub Pages subpath — no changes needed.

## Data & accounting notes
- First load auto-creates the 37 initial members (rooms 101–121) with ৳0
  deposits, exactly as specified — nothing is invented.
- Rent is **postpaid**: `বর্তমান বকেয়া/অগ্রিম = ভাড়া + পূর্ববর্তী বকেয়া − পূর্ববর্তী অগ্রিম − জমা`.
- Deposit and WiFi are tracked completely separately from rent — they never
  mix into the rent balance.
- Every payment is stored as its own transaction (nothing is overwritten);
  enter a negative amount to record a correcting adjustment.
- Use **সেটিংস → ব্যাকআপ ডাউনলোড** regularly to save a JSON copy of all data
  outside the browser (e.g. before clearing browser data or switching phones).
- Storage key: `rs_chatrabash_v3` (versioned, so future updates can migrate
  safely).

## Verified against the spec's test cases
The postpaid calculation was checked against all three worked examples in the
spec (Ferb–Jun 2026 চক্র for ইয়াহিয়া, the ৳600 due case, and the ৳200 advance
case) and produces matching due/advance amounts.
