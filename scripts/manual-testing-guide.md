# Manual End-to-End Testing Guide
## Phase 5 Database Integration

This guide provides comprehensive manual testing steps to verify all CRUD operations and features work correctly.

---

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   Server should be running at http://localhost:3000

2. **Verify database connection:**
   - Check `.env.local` has valid `DATABASE_URL`
   - Ensure Supabase database is accessible

---

## Test 1: Dashboard Page (READ Operations)

### Steps:
1. Navigate to http://localhost:3000
2. Verify the page loads without errors
3. Check browser console for any errors (F12 → Console)

### Expected Results:
- ✅ Energy Portfolio loads by default
- ✅ 5 stocks displayed (CNQ, SU, TRMLF, AETUF, TRP)
- ✅ Each stock shows: Symbol, Shares, Avg Price, Current Price, P&L
- ✅ Portfolio summary shows: Total Value, Total Cost, Borrowed Amount, Equity %
- ✅ No errors in console
- ✅ Prisma queries visible in terminal logs

### Verify Database Integration:
- Check terminal output for Prisma queries like:
  ```
  prisma:query SELECT "public"."Portfolio"...
  prisma:query SELECT "public"."Stock"...
  ```

---

## Test 2: Portfolio Switching

### Steps:
1. Click "Switch to Copper Portfolio" button
2. Wait for page to reload
3. Verify stocks change

### Expected Results:
- ✅ Page reloads showing Copper Portfolio
- ✅ 4 stocks displayed (FCX, COPX, ERO, HBM)
- ✅ Portfolio values update correctly
- ✅ Button now says "Switch to Energy Portfolio"
- ✅ New Prisma queries in terminal for Copper portfolio

---

## Test 3: Thesis Page (READ with JSON Fields)

### Steps:
1. Navigate to http://localhost:3000/thesis
2. Verify page loads without errors
3. Check each thesis card displays correctly

### Expected Results:
- ✅ 4 thesis cards displayed for Energy Portfolio
- ✅ Each card shows:
  - Title (Margin Decision, Delever Decision, etc.)
  - Description and Rationale
  - Health Score (90-95%)
  - Urgency indicator (green/yellow/red)
  - Key Metrics with values
  - Stop Loss Rules
  - Exit Criteria
- ✅ Metrics show real-time values from database stocks
- ✅ No "undefined" or null values displayed
- ✅ Prisma queries for InvestmentThesis in terminal

### Verify JSON Fields:
- Check that Key Metrics, Stop Loss Rules, and Exit Criteria are properly formatted arrays/objects
- Verify metrics show current portfolio equity %, margin used, etc.

---

## Test 4: Checklist Page (READ with Calculations)

### Steps:
1. Navigate to http://localhost:3000/checklist
2. Verify page loads without errors
3. Review generated tasks

### Expected Results:
- ✅ Daily checklist loads for Energy Portfolio
- ✅ Tasks are categorized:
  - Price Updates (5 tasks for energy stocks)
  - Margin Monitoring (3-4 tasks)
  - Commodity Tracking (2-3 tasks)
  - News Monitoring (2-3 tasks)
- ✅ Portfolio value and equity % calculated from database
- ✅ Tasks can be checked/unchecked
- ✅ Completion percentage updates
- ✅ LocalStorage saves completion state

### Verify Database Metrics:
- Portfolio value should match Dashboard ($19,945.80 for energy)
- Equity % should match Dashboard (69.9% for energy)
- Borrowed amount should be correct ($6,000 for energy)

---

## Test 5: API Endpoints (Direct Testing)

### Test GET /api/portfolio:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/portfolio" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Expected:** JSON array with 2 portfolios (energy, copper), includes stocks array with _count

### Test GET /api/stocks?portfolioId=:
```powershell
# Get portfolioId first from /api/portfolio response
Invoke-WebRequest -Uri "http://localhost:3000/api/stocks?portfolioId=cmhzwncyg0000ppgop7pa4z57" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Expected:** JSON array of stocks for that portfolio, sorted by symbol

### Test GET /api/thesis?portfolioId=:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/thesis?portfolioId=cmhzwncyg0000ppgop7pa4z57" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Expected:** JSON array of 4 theses with full JSON fields (keyMetrics, stopLossRules, exitCriteria)

---

## Test 6: CRUD Operations (Database Testing)

### Run Automated Test Script:
```bash
npx tsx scripts/test-e2e.ts
```

**Expected Output:**
- ✅ All 10 test sections pass (90 assertions total)
- ✅ CREATE: Test stock created
- ✅ UPDATE: Stock shares/price updated
- ✅ DELETE: Test stock removed
- ✅ Cascade delete: Related records deleted
- ✅ Data integrity verified
- ✅ Performance under 2 seconds

**Test Coverage:**
1. READ Operations - Portfolios (7 assertions)
2. READ Operations - Stocks (31 assertions)
3. READ Operations - Investment Theses (24 assertions)
4. CREATE Operation - Add Test Stock (3 assertions)
5. UPDATE Operation - Modify Stock (3 assertions)
6. DELETE Operation - Remove Test Stock (2 assertions)
7. Relationship Integrity - Cascade Delete (2 assertions)
8. Complex Queries - Aggregations (4 assertions)
9. Data Integrity Checks (17 assertions)
10. Performance Checks (1 assertion)

---

## Test 7: Price Updates (External API Integration)

### Steps:
1. On Dashboard, wait for price updates (auto-fetch every 30 seconds)
2. Or manually refresh the page

### Expected Results:
- ✅ Stock prices update from Alpha Vantage API
- ✅ Terminal shows "Fetching Alpha Vantage quotes for: ..."
- ✅ P&L values recalculate automatically
- ✅ Portfolio value updates
- ⚠️ May hit rate limit (25 requests/day) - expected error message if so

---

## Test 8: Error Handling

### Test Invalid Portfolio ID:
```
http://localhost:3000/api/stocks?portfolioId=invalid-id
```
**Expected:** Empty array or error message, no server crash

### Test Missing Parameters:
```
http://localhost:3000/api/stocks
```
**Expected:** Returns stocks for all portfolios or appropriate error

### Test Database Connection:
- Temporarily disconnect internet
- Refresh Dashboard
**Expected:** Loading state or error message, graceful degradation

---

## Test 9: Browser Compatibility

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

**Expected:** Consistent behavior across all browsers

---

## Test 10: Performance & Console Checks

### Browser DevTools Checks:
1. Open DevTools (F12)
2. Check Console tab - should be clean (warnings acceptable)
3. Check Network tab - verify API calls complete successfully
4. Check React DevTools - verify component tree

### Expected Console Messages:
- ✅ No red errors (warnings about position:sticky are acceptable)
- ✅ Prisma queries logged in server terminal
- ✅ API responses complete in <1 second

---

## Verification Checklist

Mark each item as you test:

### Database Integration
- [ ] Dashboard loads stocks from database
- [ ] Thesis page loads theses from database
- [ ] Checklist uses portfolio metrics from database
- [ ] Portfolio switching works correctly
- [ ] All Prisma queries execute successfully

### Data Integrity
- [ ] No null/undefined values displayed
- [ ] Calculations are accurate (P&L, equity %, etc.)
- [ ] JSON fields render correctly (keyMetrics, stopLossRules, exitCriteria)
- [ ] Stock count matches database (9 total)
- [ ] Thesis count matches database (8 total)

### CRUD Operations (via test-e2e.ts)
- [ ] CREATE: Can add new stock
- [ ] READ: Can fetch all portfolios, stocks, theses
- [ ] UPDATE: Can modify stock values
- [ ] DELETE: Can remove records
- [ ] Cascade deletes work properly

### User Experience
- [ ] Pages load quickly (<2 seconds)
- [ ] No loading spinners stuck indefinitely
- [ ] Error messages are user-friendly
- [ ] UI is responsive and functional
- [ ] No broken layouts or styling issues

### API Endpoints
- [ ] GET /api/portfolio returns valid data
- [ ] GET /api/stocks?portfolioId= returns valid data
- [ ] GET /api/thesis?portfolioId= returns valid data
- [ ] All endpoints return proper JSON
- [ ] Error responses are handled gracefully

---

## Known Issues / Acceptable Warnings

1. **Next.js layout-router.js warning about position:sticky**
   - ⚠️ Warning: "Skipping auto-scroll behavior due to `position: sticky` or `position: fixed`"
   - **Status:** Harmless, from StonksAI chatbot component
   - **Action:** No fix needed

2. **Alpha Vantage Rate Limit**
   - ⚠️ Error: "RATE_LIMIT: 25 requests per day"
   - **Status:** Expected when API quota exceeded
   - **Action:** Use cached prices or wait for quota reset

3. **Prisma Query Logs in Console**
   - ℹ️ Info: Long SQL queries in terminal
   - **Status:** Expected in development mode
   - **Action:** Disable with `prisma:query` log level in production

---

## Success Criteria

### Phase 5 is COMPLETE when:
- ✅ All 90 automated tests pass
- ✅ All 3 main pages load from database (Dashboard, Thesis, Checklist)
- ✅ Portfolio switching works correctly
- ✅ CRUD operations work (verified by test-e2e.ts)
- ✅ No critical errors in browser console
- ✅ Database queries execute in reasonable time (<2 seconds)
- ✅ Data integrity verified (no orphaned records)

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Solution:** Check `.env.local` has correct DATABASE_URL, verify Supabase is accessible

### Issue: "Module not found" errors
**Solution:** Run `npm install` to ensure all dependencies installed

### Issue: Pages show loading forever
**Solution:** Check terminal for API errors, verify database has data (run `npx tsx scripts/verify-integration.ts`)

### Issue: Stock prices not updating
**Solution:** Alpha Vantage rate limit likely hit, prices will update when quota resets or use fallback data

### Issue: TypeScript errors
**Solution:** Run `npx tsc --noEmit` to check compilation, fix any type errors

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark Test 5 as complete in todo list
2. ✅ Commit Phase 5 completion
3. 🚀 Ready for Phase 6 (AI Integration) or Production Deployment

**Congratulations! Phase 5 Database Integration is complete! 🎉**
