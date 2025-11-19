# API Provider Comparison

## Financial Modeling Prep (Recommended)
**Free Tier: 250 requests/day**
- ✅ Single batch request for multiple symbols
- ✅ Real-time US stock quotes
- ✅ International stocks (TSX, LSE, etc.)
- ✅ Fast response times
- ✅ No premium API key needed
- Sign up: https://site.financialmodelingprep.com/developer/docs/

## Alpha Vantage (Fallback)
**Free Tier: 25 requests/day**
- ⚠️ Very limited rate (5 requests/minute, 25/day)
- ✅ Real-time US stock quotes
- ✅ Canadian stocks (TSX)
- ⚠️ Slower response times
- Sign up: https://www.alphavantage.co/support/#api-key

## Setup Instructions

1. **Get FMP API Key** (Recommended)
   - Visit: https://site.financialmodelingprep.com/developer/docs/
   - Sign up for free account
   - Copy your API key
   - Add to `.env.local`: `FMP_API_KEY=your_key_here`

2. **Configure Provider**
   - In `.env.local`, set: `STOCK_API_PROVIDER=fmp`
   - Or use `alphavantage` for the original provider

3. **Restart Server**
   - Run: `npm run dev`
   - The app will use your chosen provider

## Usage Comparison

### Daily Request Budget
- **FMP**: 250 requests/day = ~10 portfolio refreshes/day (9 symbols each)
- **Alpha Vantage**: 25 requests/day = ~2-3 portfolio refreshes/day

### Batch Fetching
- **FMP**: Single request for all 9 symbols = 1 API call
- **Alpha Vantage**: 9 separate requests (1 per symbol) = 9 API calls

### Best Practice
Use FMP as primary provider. Keep Alpha Vantage key as backup in case FMP rate limit is hit.
