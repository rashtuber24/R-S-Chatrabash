# RS Chatrabash

Mobile-first PWA for postpaid mess rent management. The app keeps a local offline copy and can optionally synchronize the same mess data across devices using Supabase.

## Files
- `index.html` app shell and CDN libraries
- `styles.css` UI
- `app.js` application logic, accounting, PDF and cloud sync
- `manifest.json` PWA manifest
- `sw.js` service worker
- `supabase.sql` database/RLS setup for cloud sync
- `icon-192.png`, `icon-512.png` app icons

## Important data
- 37 initial members, rooms 101-121
- Room 106: ৳1,120 per member
- Expected monthly rent total: ৳41,200
- Rent is postpaid: collection month pays the previous rent month
- Deposit and WiFi are separate from rent

## GitHub Pages
Upload all files to the repository root and enable GitHub Pages from the `main` branch/root folder.

## Cloud sync setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. In Supabase Authentication, enable Email/Password.
4. In the app, open Settings → Cloud Sync.
5. Enter the Supabase Project URL and the public anon/publishable key.
6. Create an account or log in using the same email/password on every device.
7. Use `এখনই সিঙ্ক` after the first login. Future changes sync automatically when online.

Never put a Supabase service-role key in the app.

## Offline
The app stores data locally. If cloud sync is configured, changes are saved locally first and then synchronized when internet is available. A sync status is shown in the top bar.

## PDF
Reports can be downloaded from the Reports page. Individual member profiles also have a PDF button. PDF generation uses `html2pdf.js` and renders Bengali text through the browser.
