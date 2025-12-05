# Phase 3 Debug Guide

## Where to See Logs

### ❌ WRONG: Browser Console
The logs will NOT appear in your browser's DevTools console.

### ✅ CORRECT: Server Terminal
Look at the **terminal where you ran `npm run dev`**

**Expected output:**
```
[StockDataService] Fresh fetch for AAPL from tiingo
[StockDataService] Cache hit for AAPL (age: 2m)
[StockDataService] Batch complete: 10 success, 0 errors
```

---

## Quick Verification Steps

### 1. Check Environment Variables

Open `.env.local` and verify:
```bash
FEATURE_TIINGO_ENABLED=true
TIINGO_API_KEY=your_actual_tiingo_key_here
```

If missing, add them and **restart the dev server**:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### 2. Test API Directly (Easier Debug)

Open a **new terminal** and run:
```bash
# Test the fundamentals API (forces fresh fetch)
curl "http://localhost:3000/api/fundamentals?ticker=AAPL"
```

**Check the SERVER console** (where npm run dev is running) for:
```
[/api/fundamentals] Fetching fundamentals for: AAPL
[StockDataService] Fresh fetch for AAPL from tiingo
```

### 3. Check Dashboard Page Source

The dashboard might not be fetching stock quotes on load. Check:
1. Does the dashboard have a portfolio?
2. Does it show any stock symbols?
3. Try navigating to a specific stock: `http://localhost:3000/stocks/AAPL`

### 4. Test Stock Detail Page

This should definitely trigger a fetch:
```
http://localhost:3000/stocks/AAPL
```

**Look in SERVER console** for:
```
[StockDataService] Fetching batch quotes for 1 symbols
[StockDataService] Fresh fetch for AAPL from tiingo
```

---

## Troubleshooting

### Issue: No Logs at All

**Cause:** Tiingo not enabled or API key missing

**Fix:**
```bash
# Check .env.local
cat .env.local | grep TIINGO

# Should show:
# FEATURE_TIINGO_ENABLED=true
# TIINGO_API_KEY=xxxxx
```

**If missing, add:**
```bash
echo "FEATURE_TIINGO_ENABLED=true" >> .env.local
echo "TIINGO_API_KEY=your_key_here" >> .env.local
```

**Restart server:**
```bash
# Press Ctrl+C in server terminal
npm run dev
```

### Issue: Seeing Yahoo Finance Logs Instead

**Log you see:**
```
[StockDataService] Fresh fetch for AAPL from yahooFinance
```

**Cause:** Tiingo is disabled or failing, falling back to Yahoo

**Check:**
1. Is `FEATURE_TIINGO_ENABLED=true`?
2. Is `TIINGO_API_KEY` valid?
3. Any errors in server console about Tiingo?

### Issue: Dashboard Shows Nothing

**Possible causes:**
1. No portfolio created yet
2. Portfolio has no stocks
3. Page still loading

**Try this instead:**
```
http://localhost:3000/stocks/AAPL
```

---

## Expected Console Output (Server Side)

### First Request (Fresh Fetch)
```
GET /api/fundamentals?ticker=AAPL 200
[/api/fundamentals] Fetching fundamentals for: AAPL
[StockDataService] Fresh fetch for AAPL from tiingo
[StockDataService] Batch complete: 1 success, 0 errors (0 cached, 1 fresh)
[/api/fundamentals] Returning fundamentals for AAPL (source: yahoo)
```

### Second Request (Cached)
```
GET /api/fundamentals?ticker=AAPL 200
[/api/fundamentals] Fetching fundamentals for: AAPL
[StockDataService] Cache hit for AAPL (age: 1m)
[/api/fundamentals] Returning fundamentals for AAPL (source: yahoo)
```

### Batch Request (Multiple Symbols)
```
GET /api/quote?symbols=AAPL,MSFT,GOOGL 200
[StockDataService] Fetching batch quotes for 3 symbols
[StockDataService] Fresh fetch for AAPL from tiingo
[StockDataService] Fresh fetch for MSFT from tiingo
[StockDataService] Fresh fetch for GOOGL from tiingo
[StockDataService] Batch complete: 3 success, 0 errors (0 cached, 3 fresh)
```

---

## Quick Test Script

Run this in a **new terminal** while dev server is running:

```bash
# Test 1: Single quote
echo "=== Test 1: Single Quote ==="
curl -s "http://localhost:3000/api/fundamentals?ticker=AAPL" | jq '.ticker, .price'

# Test 2: Wait 2 seconds, test cache
echo ""
echo "=== Test 2: Cache Test (should be instant) ==="
sleep 2
curl -s "http://localhost:3000/api/fundamentals?ticker=AAPL" | jq '.ticker, .price'

# Test 3: Different symbol
echo ""
echo "=== Test 3: Different Symbol ==="
curl -s "http://localhost:3000/api/fundamentals?ticker=MSFT" | jq '.ticker, .price'
```

**Check SERVER console during these tests!**

---

## If Still Not Working

### Check Provider Configuration

```bash
# Test Tiingo API directly (outside our app)
curl "https://api.tiingo.com/tiingo/daily/AAPL/prices?token=YOUR_TIINGO_KEY"
```

If this fails:
- ❌ API key is invalid
- ❌ No internet connection
- ❌ Tiingo service is down

### Enable Debug Mode

Add to `.env.local`:
```bash
DEBUG=true
NODE_ENV=development
```

Restart server and check for more detailed logs.

### Check Orchestrator Stats

```bash
curl "http://localhost:3000/api/telemetry/stats" | jq
```

Should show:
```json
{
  "circuitBreakers": {
    "tiingo": {
      "state": "closed",
      "failures": 0
    }
  }
}
```

If `state: "open"`, circuit breaker tripped - Tiingo is failing.

---

## Success Indicators

You know it's working when you see in **SERVER console**:

1. ✅ `[StockDataService] Fresh fetch for AAPL from tiingo`
2. ✅ `[StockDataService] Cache hit for AAPL (age: Xm)`
3. ✅ `[StockDataService] Batch complete: X success, 0 errors`
4. ✅ No "Failed to fetch" errors
5. ✅ Circuit breaker state: "closed"

---

## Next Steps

1. **Verify env vars** in `.env.local`
2. **Restart dev server** (important!)
3. **Test API directly** with curl
4. **Watch SERVER console** (not browser console)
5. **Navigate to** `/stocks/AAPL`
6. **Check logs** in server terminal

If you see the Tiingo logs, Phase 3 is working correctly! ✅
