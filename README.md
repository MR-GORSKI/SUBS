# SUBS — Subscription Tracker

Brutalist gantt-style tracker for recurring charges. See every subscription, when it bills, and how much it has cost — past and projected.

**Live**: https://mr-gorski.github.io/SUBS/ *(after GitHub Pages is enabled)*

## Stack

Pure static SPA. No build step.

- React 18 + ReactDOM via UMD CDN.
- Babel-standalone compiles JSX in the browser.
- All state in `localStorage` (until Supabase is wired).
- Single entry: `index.html`. Picks Desktop or Mobile shell via `matchMedia(<=768px)`.

See [SPEC.md](SPEC.md) for full architecture, contracts, and invariants.

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

- [ ] Supabase backend (Postgres + Auth).
- [ ] Google OAuth (single sign-in option).
- [ ] Multi-currency.
- [ ] Categories and service logos.
- [ ] Spending chart (per month aggregate).
