# Live Portfolio Tracker

> **📖 PURPOSE:** Public-facing project overview for users, contributors, and new developers.
> **WHEN TO USE:** First stop for anyone discovering this project - explains what it does, how to deploy it, and basic setup.
> **UPDATE FREQUENCY:** When major features launch or deployment instructions change.

**70/30 Cash-Margin** | **Live Prices** | **Daily Snapshot** | **Stop-Loss & Take Profit** | **DRIP**

## Features
- Energy & Copper portfolios
- Live WTI, NG, Copper prices (Polygon)
- Daily 9:30 AM ET market snapshot + 5 news
- Stop-Loss (-30%), Take Profit (+50%)
- Dividend Reinvestment (DRIP)
- Mobile responsive
- IndexedDB cache
- Vercel free-tier

## Notes
- The app is currently forced to use Alpha Vantage for stock quotes (see `app/api/quote/route.ts`).
- The FMP client remains in the codebase (`lib/api/fmp.ts`) as a reference; it uses the `/stable` endpoints and per-symbol `/quote?symbol=` requests to support free-tier accounts.

## Portfolio Change Quota (AI batch refresh)

- Purpose: Track client-initiated portfolio batch refreshes when the user's portfolio changes.
- Tier behavior: Free tier has a daily limit (default 3/day); Basic/Premium tiers are unlimited.
- Detection: The client detects portfolio changes using `localStorage` and only calls the server to check/record a change when an actual change is detected (first batch ever and cache-only refreshes do not count).
- Server: The server exposes `/api/ai/portfolio-change` to GET quota status and POST to record a counted change.
- Migration: A safe SQL migration is provided at `src/backend/database/supabase/migrations/001_add_portfolio_changes.sql` to add the `portfolio_changes` tracking column, including backup/copy steps and RLS recreation.

See `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md` for implementation details and the client/server flow.

### Re-enable configurable provider (env-driven)

If you want the app to choose the provider at runtime using an environment variable, revert the forced provider in `app/api/quote/route.ts` and use `STOCK_API_PROVIDER` from your `.env.local`.

1. Edit `app/api/quote/route.ts` and replace the forced provider lines with:

```ts
// Choose API provider: 'alphavantage' or 'fmp'
const API_PROVIDER = process.env.STOCK_API_PROVIDER || 'alphavantage';
```

2. Update your `.env.local` to select the provider you want (example):

```powershell
STOCK_API_PROVIDER=fmp
```

3. Restart the dev server (PowerShell):

```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue; npm run dev
```

Notes:
- Setting `STOCK_API_PROVIDER=fmp` will use the FMP client; depending on your FMP plan some endpoints (like batch) are restricted and the client uses per-symbol `/stable/quote` calls to maximize compatibility.
- Setting `STOCK_API_PROVIDER=alphavantage` will use Alpha Vantage as the provider.

## Deploy

1. Fork repo
2. Add `.env.local` with API keys
3. Deploy to Vercel

git init
git add .
git commit -m "complete mobile-responsive portfolio tracker"
git branch -M main
git remote add origin https://github.com/yourname/portfolio-tracker.git
git push -u origin main