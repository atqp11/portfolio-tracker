# Live Portfolio Tracker

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