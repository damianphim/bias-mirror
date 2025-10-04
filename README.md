# Bias Mirror for Groups (MVP)

Chrome extension that shows a per-document bias snapshot (gender/geography) and
aggregates anonymized counts into a group dashboard.

## Quick Start

1) Supabase
- Create project → SQL → run `supabase/bootstrap.sql`
- Note your `SUPABASE_URL` + `anon key`

2) Dashboard
- Copy `dashboard/config.example.js` → `dashboard/config.js` with your keys
- Serve locally: `npx serve dashboard` → open `http://localhost:3000/?g=CS-201-F25`

3) Extension
- In `extension/service_worker.js`, set `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Load unpacked at `chrome://extensions` → "Load unpacked" → select `extension/`
- In the popup, set **Group ID** to `CS-201-F25`

4) Demo
- Open a syllabus page, the toast shows a snapshot
- Open the dashboard URL; refresh to see aggregates update
