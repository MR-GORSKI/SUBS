# SUBS — Subscription Tracker

Brutalist gantt-style tracker for recurring charges. See every subscription, when it bills, and how much it has cost — past and projected.

**Live**: https://mr-gorski.github.io/SUBS/ *(after GitHub Pages is enabled)*

## Stack

Pure static SPA. No build step.

- React 18 + ReactDOM via UMD CDN.
- Babel-standalone compiles JSX in the browser.
- Supabase: Postgres + Auth (Google OAuth only). RLS enforces per-user isolation.
- Single entry: `index.html`. Picks Desktop or Mobile shell via `matchMedia(<=768px)`.

See [SPEC.md](SPEC.md) for architecture, contracts, and invariants.

## Backend setup (one-time)

1. Create a Supabase project.
2. SQL Editor → run [`schema.sql`](schema.sql).
3. Authentication → Providers → enable Google. Set Client ID/Secret from Google Cloud Console.
4. In Google Cloud → OAuth consent + Credentials:
   - Authorized JavaScript origins: your deployed URL.
   - Authorized redirect URIs: the Supabase callback URL.
5. Project URL + anon key go into `supabase.js` (top of file).

## Local development

Open `index.html` directly, or run any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deploy (GitHub Pages)

1. Push to GitHub.
2. Settings → Pages → Source: `Deploy from a branch` → Branch `main`, folder `/ (root)` → Save.
3. URL appears within ~1 minute.

## Roadmap

- [x] Supabase backend (Postgres + Auth).
- [x] Google OAuth.
- [x] Realtime cross-device sync.
- [ ] Multi-currency.
- [ ] Categories and service logos.
- [ ] Spending chart (per month aggregate).
- [ ] Push notifications for upcoming charges.
