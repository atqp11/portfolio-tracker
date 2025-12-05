# E2E & UX Fallback Tests - Phase 4 Workstream 5

## Overview

E2E tests validate that the user interface gracefully handles error scenarios and provider failures. These tests use Playwright to simulate real user interactions and verify that the system continues to function (or shows helpful error messages) when data sources fail.

## Purpose

Phase 4 requires validating:

1. **Graceful Degradation**: UI remains functional when APIs fail
2. **Stale Data Handling**: Old data is shown with clear indicators
3. **Loading States**: Users understand what's happening during failures
4. **Error Messages**: Errors are user-friendly with suggested actions
5. **Circuit Breaker Integration**: CB state doesn't break the UI
6. **Recovery**: UI recovers when services return online
7. **Resilience**: Multiple failures don't cause memory leaks or crashes

## Test Structure

### Test Categories

1. **Cache Failure Scenarios** (3 tests)
   - Cached data displayed when cache unavailable
   - Stale data indicators shown correctly
   - Auto-retry when cache recovers

2. **Provider Failure Scenarios** (4 tests)
   - Fallback to alternate provider
   - Loading state during fallback
   - Error messages after all providers fail
   - Recovery actions available

3. **Circuit Breaker Scenarios** (3 tests)
   - CB open state handled gracefully
   - CB status indicator shown
   - Auto-retry after recovery

4. **Slow Provider Scenarios** (2 tests)
   - Placeholder shown while waiting
   - Timeout handled if exceeds threshold

5. **Partial Data Scenarios** (2 tests)
   - Some data shown if partial success
   - Missing data indicators

6. **User Experience** (3 tests)
   - Navigation stays accessible during errors
   - Error messages are helpful
   - Scroll position maintained

7. **Recovery & Resilience** (2 tests)
   - Recovery from temporary outages
   - No memory leaks or error accumulation

## Test Data Attributes

Tests rely on data-testid attributes in the UI components:

| Attribute | Purpose | Examples |
|-----------|---------|----------|
| `loading` | Loading/skeleton state | Spinner, skeleton cards |
| `error` | Error message container | Error banner |
| `content` | Main content area | Stock cards, charts |
| `stale-data` | Stale data indicator | "Last updated 10m ago" |
| `refresh-button` | Refresh/retry button | Refresh icon button |
| `provider-fallback` | Fallback indicator | "Using Yahoo Finance" |
| `circuit-breaker-status` | CB state badge | "Circuit: CLOSED" |
| `quote`, `fundamentals` | Specific data sections | Quote card, fundamentals table |
| `error-message` | Error text | "Unable to fetch data" |
| `error-suggestion` | Suggested action | "Try refreshing the page" |
| `retry-button` | Retry action button | "Retry" button |
| `back-button` | Navigation back | Back arrow |
| `stock-card` | Individual stock card | Stock card in list |
| `quote-price` | Quote price value | Price display |
| `sidebar` | Navigation sidebar | Left sidebar |
| `nav-button` | Navigation button | Dashboard, Stocks, Risk links |

## Running E2E Tests

### Prerequisites

```bash
npm install  # Already includes Playwright
npm run dev  # Start dev server in another terminal
```

### Run All E2E Tests

```bash
npm run e2e
```

### Run Specific Test File

```bash
npm run e2e -- error-scenarios.spec.ts
```

### Run Tests in Headed Mode (see browser)

```bash
npm run e2e:headed
```

### Run Tests with Debug Mode

```bash
npm run e2e:debug
```

### Generate Report After Tests

```bash
npm run e2e:report
```

## Expected Test Execution

Each test suite performs:

1. **Setup**: Navigate to specific page, establish baseline
2. **Simulate Failure**: Mock APIs, inject failures via localStorage
3. **Verify Graceful Handling**: Check UI shows appropriate state
4. **Recover**: Restore functionality and verify recovery
5. **Cleanup**: Browser context cleaned between tests

### Timeline

- **Warm-up**: 5-10s (page load, initial content)
- **Per test**: 10-30s (simulate failures, verify behavior)
- **Total**: ~15 minutes for full suite (48 tests)

## Test Scenarios Explained

### Cache Failure Scenarios

**Scenario 1: Cache Unavailable**
- Navigate to dashboard
- Inject failure flag via localStorage
- Reload page
- Verify content displays (cached or stale) without error

**Scenario 2: Stale Data Indicator**
- Mock API to return `X-Cache-Status: stale` header
- Navigate to dashboard
- Verify stale indicator visible
- Verify old data still displayed

**Scenario 3: Cache Recovery**
- Start with stale data
- Remove failure flag
- Trigger refresh
- Verify stale indicator gone, fresh content shown

### Provider Failure Scenarios

**Scenario 1: Fallback Provider**
- Set `localStorage.FAIL_PROVIDER = "tiingo"`
- Navigate to stocks page
- Verify content displays (via Yahoo Finance fallback)
- Check for optional fallback indicator

**Scenario 2: Provider Fallback Loading**
- Slow down API response (3 second delay)
- Trigger refresh
- Verify loading state appears
- Verify page remains interactive
- Verify content eventually appears

**Scenario 3: All Providers Fail**
- Set `localStorage.FAIL_ALL_PROVIDERS = "true"`
- Navigate to stocks page
- Verify error message displayed
- Verify recovery action available (retry button)

**Scenario 4: Error After Fallback**
- Mock one provider fails, fallback succeeds
- Navigate to page
- Verify content displays (via fallback)
- May show note about primary provider being down

### Circuit Breaker Scenarios

**Scenario 1: CB Open**
- Set `localStorage.TRIGGER_CIRCUIT_BREAKER = "true"`
- Navigate to dashboard
- Verify UI handles gracefully (shows error, stale data, or loading)
- Verify page doesn't crash

**Scenario 2: CB Status Display**
- Navigate to dashboard
- Look for circuit breaker status indicator
- Verify state is "closed", "open", or "half-open"

**Scenario 3: CB Recovery**
- Trigger CB open
- Verify error displayed
- Remove failure flag
- Click refresh
- Verify content now displays, error gone

### Slow Provider Scenarios

**Scenario 1: Placeholder/Skeleton**
- Slow API response (5 seconds)
- Navigate to quote page
- Verify loading/skeleton state shows
- Verify content eventually appears
- Verify latency is acceptable

**Scenario 2: Timeout Handling**
- Mock API never responds (infinite timeout)
- Navigate to quote page
- Wait 15+ seconds (past timeout)
- Verify error or stale data shown
- Verify page not hung/frozen

### Partial Data Scenarios

**Scenario 1: Some APIs Succeed**
- Mock: quote endpoint works, fundamentals endpoint fails
- Navigate to stock detail page
- Verify quote data displays
- Verify fundamentals section shows error or N/A
- Verify page doesn't crash

**Scenario 2: Missing Data**
- Mock risk metrics returns null
- Navigate to risk page
- Verify "No data available" message shown
- Verify page doesn't crash

### User Experience Tests

**Scenario 1: Navigation Access**
- Fail all APIs
- Navigate to dashboard
- Verify sidebar/navigation remains clickable
- Verify can navigate to other pages

**Scenario 2: Helpful Error Messages**
- Trigger 500 error
- Navigate to page
- Verify error message is user-friendly
- Verify no technical jargon (TypeError, etc.)
- Verify suggested action shown (retry, refresh, contact support)

**Scenario 3: Scroll Position**
- Navigate to stocks list
- Scroll down (500px)
- Click refresh
- Wait for reload
- Verify scroll position maintained (within 100px)

### Recovery Tests

**Scenario 1: Temporary Outage Recovery**
- Load page normally
- Fail all APIs
- Reload page → error shown
- Restore APIs
- Click refresh → content shown

**Scenario 2: No Memory Leaks**
- Repeat failure/recovery cycle 5 times
- Verify page remains responsive
- Verify can navigate away
- Verify no console errors about memory

## Interpreting Test Results

### Passing Test

```
✓ should display cached data when cache is unavailable (2.5s)
```

All assertions passed, UI handled scenario correctly.

### Failing Test

```
✗ should display cached data when cache is unavailable
  expect(initialState.hasContent).toBe(true)
```

UI behavior didn't match expectation. Check:

1. Are data-testid attributes present in components?
2. Are components rendering their error/loading states?
3. Are API mocks working correctly?
4. Is the dev server running?

### Flaky Test

Test passes sometimes, fails other times:

- May indicate timing issue (network race condition)
- May indicate component rendering inconsistently
- Solutions:
  - Increase wait timeouts
  - Add explicit waits for elements
  - Check component lifecycle

## Troubleshooting

### "Dev server not responding"

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run e2e
```

### Tests timeout waiting for elements

**Issue**: Components don't render data-testid attributes
**Solution**: Add attributes to UI components:

```tsx
<div data-testid="loading">
  <Spinner />
</div>
```

### API mocks not working

**Issue**: `page.route()` mocks not intercepting requests
**Solution**: Ensure page is navigated after setting up mocks:

```ts
await page.route("**/api/**", (route) => route.abort());
await page.goto(`${BASE_URL}/dashboard`); // After setting up mock
```

### "Uncaught exception in evaluation script"

**Issue**: localStorage injection failing
**Solution**: Ensure context exists before injecting:

```ts
const context = await browser.newContext();
const page = await context.newPage();
await page.context().addInitScript(() => {
  localStorage.setItem("key", "value");
});
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: |
    npx playwright install
    npm run e2e
    
- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v2
  with:
    name: playwright-report
    path: playwright-report/
```

### Environment Variables

```bash
# Override dev server URL
E2E_TEST_URL=http://staging.example.com npm run e2e

# Run single browser
BROWSER=chromium npm run e2e

# Headed mode in CI
npm run e2e:headed -- --workers=1
```

## Adding New Test Cases

### Template for New Test

```typescript
test("should [verify specific behavior]", async ({ page }) => {
  // 1. Navigate to page
  await page.goto(`${BASE_URL}/path`);
  await waitForPageStable(page);

  // 2. Get baseline state
  const baseline = await getPageState(page);
  expect(baseline.hasContent).toBe(true);

  // 3. Simulate failure/condition
  await page.context().addInitScript(() => {
    localStorage.setItem("FAIL_FLAG", "true");
  });

  // 4. Verify behavior
  await page.reload();
  await waitForPageStable(page);

  const degraded = await getPageState(page);
  expect(degraded.hasError || degraded.hasStaleIndicator).toBe(true);

  // 5. Verify recovery (optional)
  await page.context().addInitScript(() => {
    localStorage.removeItem("FAIL_FLAG");
  });

  await page.reload();
  await waitForPageStable(page);

  const recovered = await getPageState(page);
  expect(recovered.hasContent).toBe(true);
});
```

## Next Steps

1. **Run initial tests**: `npm run e2e` (verify setup works)
2. **Fix failing tests**: Add missing data-testid attributes
3. **Establish baseline**: Document which tests pass/fail
4. **Integration**: Add to CI/CD pipeline
5. **Monitoring**: Set up test result reporting

## References

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Assertions](https://playwright.dev/docs/assertions)
- [Data-testid Best Practices](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change)
- [Phase 4 Testing Plan](../product/Planning/refactoring/production-readiness-2024/PHASE_4_TESTING_HARDENING.md)
- [Cache Configuration](../src/lib/config/cache.config.ts)
- [Error Handling Patterns](../src/lib/data-sources/orchestrator.ts)
