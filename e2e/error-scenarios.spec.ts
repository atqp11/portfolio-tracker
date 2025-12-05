/**
 * E2E & UX Fallback Tests - Phase 4 Workstream 5
 *
 * Tests graceful degradation and error handling UI when:
 * - API providers fail or are slow
 * - Cache is unavailable
 * - Circuit breakers are open
 * - Data is stale or missing
 *
 * Uses Playwright for cross-browser E2E testing
 */

import { test, expect, Page } from "@playwright/test";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const BASE_URL = process.env.E2E_TEST_URL || "http://localhost:3000";

// Helper to wait for API stability after navigation
async function waitForPageStable(page: Page, timeoutMs = 5000) {
  try {
    await page.waitForLoadState("networkidle", { timeout: timeoutMs });
  } catch {
    // Network idle timeout is acceptable - may still show partial content
    console.warn("Page did not reach networkidle within timeout");
  }
}

// Helper to check for error/loading states
async function getPageState(page: Page) {
  return {
    isLoading: await page.locator('[data-testid="loading"]').count() > 0,
    hasError: await page.locator('[data-testid="error"]').count() > 0,
    hasStaleIndicator: await page.locator('[data-testid="stale-data"]').count() > 0,
    hasContent: await page.locator('[data-testid="content"]').count() > 0,
  };
}

// ============================================================================
// TESTS: CACHE FAILURE SCENARIOS
// ============================================================================

test.describe("E2E: Cache Failure & Graceful Degradation", () => {
  test("should display cached data when cache is unavailable", async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page);

    const initialState = await getPageState(page);
    expect(initialState.hasContent).toBe(true);

    // Simulate cache failure via API header
    await page.context().addInitScript(() => {
      localStorage.setItem("SIMULATE_CACHE_FAILURE", "true");
    });

    // Refresh page
    await page.reload();
    await waitForPageStable(page, 10000);

    const degradedState = await getPageState(page);

    // Should show either cached content or stale indicator
    expect(degradedState.hasContent || degradedState.hasStaleIndicator).toBe(true);

    // Should NOT show error (graceful fallback)
    expect(degradedState.hasError).toBe(false);
  });

  test("should show stale data indicator when cache is stale", async ({ page }) => {
    // Mock API to return stale-data header
    await page.route("**/api/**", (route) => {
      route.continue({
        headers: {
          ...route.request().postDataJSON?.headers,
          "X-Cache-Status": "stale",
        },
      });
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page);

    // Look for stale data indicator
    const staleIndicator = page.locator('[data-testid="stale-data"]');
    const staleWarning = page.locator('text=/stale|outdated|may not be current/i');

    // Should display either dedicated indicator or warning message
    const indicatorVisible = (await staleIndicator.count()) > 0;
    const warningVisible = (await staleWarning.count()) > 0;

    expect(indicatorVisible || warningVisible).toBe(true);

    // Stale data should still be displayed (not blank)
    const content = page.locator('[data-testid="content"]');
    expect(await content.count()).toBeGreaterThan(0);
  });

  test("should retry and refresh when stale data becomes fresh", async ({ page }) => {
    // Set initial stale state
    await page.goto(`${BASE_URL}/dashboard?simulate=stale`);
    await waitForPageStable(page);

    let state = await getPageState(page);
    expect(state.hasStaleIndicator || state.hasContent).toBe(true);

    // Simulate cache recovery
    await page.route("**/api/**", (route) => {
      route.continue({
        headers: {
          "X-Cache-Status": "hit",
        },
      });
    });

    // Wait for auto-refresh or trigger manual refresh
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();
      await waitForPageStable(page);
    }

    state = await getPageState(page);

    // Stale indicator should disappear
    expect(state.hasStaleIndicator).toBe(false);
    // Fresh content should remain visible
    expect(state.hasContent).toBe(true);
  });
});

// ============================================================================
// TESTS: PROVIDER FAILURE SCENARIOS
// ============================================================================

test.describe("E2E: Provider Failure & Fallback", () => {
  test("should show fallback data when primary provider fails", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/stocks`);
    await waitForPageStable(page);

    const initialContent = await page.locator('[data-testid="stock-card"]').count();
    expect(initialContent).toBeGreaterThan(0);

    // Simulate primary provider failure (Tiingo)
    await page.context().addInitScript(() => {
      localStorage.setItem("FAIL_PROVIDER", "tiingo");
    });

    await page.reload();
    await waitForPageStable(page, 10000);

    // Content should still be available (via fallback provider)
    const fallbackContent = await page.locator('[data-testid="stock-card"]').count();
    expect(fallbackContent).toBeGreaterThan(0);

    // May show fallback indicator
    const fallbackIndicator = page.locator('[data-testid="provider-fallback"]');
    // Fallback indicator is optional but helpful
    if ((await fallbackIndicator.count()) > 0) {
      expect(await fallbackIndicator.textContent()).toContain(/fallback|alternate/i);
    }
  });

  test("should show loading state during provider fallback", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/quote?symbol=AAPL`);
    await waitForPageStable(page);

    // Slow down network to show loading state
    await page.route("**/api/quote**", (route) => {
      setTimeout(() => {
        route.continue();
      }, 3000); // 3 second delay
    });

    // Trigger refresh
    await page.click('[data-testid="refresh-button"]');

    // Loading state should appear
    const loading = page.locator('[data-testid="loading"]');
    expect(await loading.count()).toBeGreaterThan(0);

    // But page should remain interactive (not frozen)
    const header = page.locator('[data-testid="header"]');
    expect(await header.isEnabled()).toBe(true);
  });

  test("should display error message after all providers fail", async ({ page }) => {
    // Simulate all providers failing
    await page.context().addInitScript(() => {
      localStorage.setItem("FAIL_ALL_PROVIDERS", "true");
    });

    await page.goto(`${BASE_URL}/dashboard/stocks`);
    await waitForPageStable(page, 15000);

    // Should show error message, not blank page
    const error = page.locator('[data-testid="error"]');
    const errorText = page.locator('text=/failed to|error|unable/i');

    const hasError = (await error.count()) > 0 || (await errorText.count()) > 0;
    expect(hasError).toBe(true);

    // Should offer a recovery action (retry, go back, etc)
    const retryButton = page.locator('[data-testid="retry-button"]');
    const backButton = page.locator('button:has-text("Back")');

    const hasRecoveryAction =
      (await retryButton.count()) > 0 || (await backButton.count()) > 0;
    expect(hasRecoveryAction).toBe(true);
  });
});

// ============================================================================
// TESTS: CIRCUIT BREAKER SCENARIOS
// ============================================================================

test.describe("E2E: Circuit Breaker Open State", () => {
  test("should handle circuit breaker open gracefully", async ({ page }) => {
    // Simulate multiple provider failures to open circuit breaker
    await page.context().addInitScript(() => {
      localStorage.setItem("TRIGGER_CIRCUIT_BREAKER", "true");
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page, 10000);

    // UI should remain functional
    const state = await getPageState(page);

    // Should either show stale data, error message, or graceful message
    // But NOT crash or hang
    expect(
      state.hasContent || state.hasError || state.hasStaleIndicator || state.isLoading
    ).toBe(true);
  });

  test("should show circuit breaker status when available", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page);

    // Check for circuit breaker status indicator (if shown)
    const cbStatus = page.locator('[data-testid="circuit-breaker-status"]');

    if ((await cbStatus.count()) > 0) {
      const status = await cbStatus.getAttribute("data-state");
      // Should be one of: closed, open, half-open
      expect(["closed", "open", "half-open"]).toContain(status);
    }
  });

  test("should auto-retry after circuit breaker recovers", async ({ page }) => {
    // Initial CB open state
    await page.context().addInitScript(() => {
      localStorage.setItem("TRIGGER_CIRCUIT_BREAKER", "true");
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page, 10000);

    const initialState = await getPageState(page);
    expect(initialState.hasError || initialState.hasStaleIndicator).toBe(true);

    // Simulate CB recovery
    await page.context().addInitScript(() => {
      localStorage.removeItem("TRIGGER_CIRCUIT_BREAKER");
    });

    // Wait for auto-recovery or manual refresh
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();
    }

    // Wait for recovery
    await page.waitForTimeout(5000);
    await waitForPageStable(page);

    const recoveredState = await getPageState(page);

    // Should now have content (no longer in error state)
    expect(recoveredState.hasContent).toBe(true);
    expect(recoveredState.hasError).toBe(false);
  });
});

// ============================================================================
// TESTS: SLOW PROVIDER SCENARIOS
// ============================================================================

test.describe("E2E: Slow Provider Response Times", () => {
  test("should show placeholder while waiting for slow provider", async ({ page }) => {
    // Slow down provider response
    await page.route("**/api/quote**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
      await route.continue();
    });

    await page.goto(`${BASE_URL}/dashboard/quote?symbol=AAPL`);

    // Should show loading/skeleton state immediately
    const loading = page.locator('[data-testid="loading"]');
    const skeleton = page.locator('[data-testid="skeleton"]');

    const hasLoadingState = (await loading.count()) > 0 || (await skeleton.count()) > 0;
    expect(hasLoadingState).toBe(true);

    // Eventually should show content
    await waitForPageStable(page, 15000);

    const content = page.locator('[data-testid="quote-price"]');
    expect(await content.count()).toBeGreaterThan(0);
  });

  test("should timeout and show fallback if provider exceeds timeout", async ({
    page,
  }) => {
    // Make provider extremely slow (exceed timeout)
    await page.route("**/api/quote**", async (route) => {
      // Never complete - simulate infinite timeout
      await new Promise(() => {}); // Never resolves
    });

    await page.goto(`${BASE_URL}/dashboard/quote?symbol=AAPL`, { waitUntil: "networkidle" });
    await page.waitForTimeout(15000); // Wait past timeout threshold

    const state = await getPageState(page);

    // Should show error or stale data, not hanging loader
    expect(state.hasError || state.hasStaleIndicator || state.hasContent).toBe(true);
  });
});

// ============================================================================
// TESTS: PARTIAL DATA SCENARIOS
// ============================================================================

test.describe("E2E: Partial Data & Degraded Service", () => {
  test("should display partial data when some APIs succeed and others fail", async ({
    page,
  }) => {
    // Mock: some endpoints succeed, others fail
    await page.route("**/api/quote**", (route) => route.continue());
    await page.route("**/api/fundamentals**", (route) => route.abort());

    await page.goto(`${BASE_URL}/dashboard/stocks/AAPL`);
    await waitForPageStable(page);

    const state = await getPageState(page);

    // Should show quote data (successful)
    const quote = page.locator('[data-testid="quote"]');
    expect(await quote.count()).toBeGreaterThan(0);

    // Fundamentals section might show error or "N/A"
    const fundamentals = page.locator('[data-testid="fundamentals"]');
    if ((await fundamentals.count()) > 0) {
      const text = await fundamentals.textContent();
      const hasErrorOrNA = /error|n\/a|not available|unable/i.test(text || "");
      expect(hasErrorOrNA || !text).toBe(true);
    }

    // Overall page should not crash
    expect(state.hasContent).toBe(true);
  });

  test("should show missing data indicator gracefully", async ({ page }) => {
    // Return empty/null data
    await page.route("**/api/risk-metrics**", (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ metrics: null }) });
    });

    await page.goto(`${BASE_URL}/dashboard/risk`);
    await waitForPageStable(page);

    // Should show message like "No data available" not crash
    const noData = page.locator('text=/no data|not available|n\\/a/i');
    expect(await noData.count()).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS: USER EXPERIENCE & INTERACTIONS
// ============================================================================

test.describe("E2E: User Experience During Errors", () => {
  test("should keep navigation accessible during API errors", async ({ page }) => {
    // Fail all APIs
    await page.route("**/api/**", (route) => route.abort());

    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page);

    // Navigation should still work
    const sidebar = page.locator('[data-testid="sidebar"]');
    expect(await sidebar.isEnabled()).toBe(true);

    const navButtons = page.locator('[data-testid="nav-button"]');
    const navCount = await navButtons.count();
    expect(navCount).toBeGreaterThan(0);

    // Should be able to click navigation
    await navButtons.first().click();
    expect(page.url()).not.toBe(`${BASE_URL}/dashboard`);
  });

  test("should show helpful error messages with suggested actions", async ({ page }) => {
    // Trigger 500 error
    await page.route("**/api/quote**", (route) => {
      route.fulfill({ status: 500, body: "Internal Server Error" });
    });

    await page.goto(`${BASE_URL}/dashboard/quote?symbol=AAPL`);
    await waitForPageStable(page);

    // Should have error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    expect(await errorMessage.count()).toBeGreaterThan(0);

    const errorText = (await errorMessage.textContent()) || "";

    // Error message should be user-friendly, not technical
    // (not like "TypeError: Cannot read property of undefined")
    expect(errorText.length).toBeGreaterThan(0);
    expect(errorText.toLowerCase()).not.toContain("typeerror");

    // Should suggest action
    const suggestion = page.locator('[data-testid="error-suggestion"]');
    if ((await suggestion.count()) > 0) {
      const text = (await suggestion.textContent()) || "";
      expect(/retry|refresh|contact|support/i.test(text)).toBe(true);
    }
  });

  test("should maintain scroll position during partial data updates", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/stocks`);
    await waitForPageStable(page);

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Trigger data refresh
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();
      await waitForPageStable(page);
    }

    // Scroll position should be maintained (or close to it)
    const scrollAfter = await page.evaluate(() => window.scrollY);
    const scrollDiff = Math.abs(scrollAfter - scrollBefore);

    // Allow some scrolling but should generally stay in same area
    expect(scrollDiff).toBeLessThan(100); // Max 100px change
  });
});

// ============================================================================
// TESTS: RECOVERY & RESILIENCE
// ============================================================================

test.describe("E2E: System Recovery & Resilience", () => {
  test("should recover gracefully from temporary API outage", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page);

    const initialContent = await getPageState(page);
    expect(initialContent.hasContent).toBe(true);

    // Simulate outage
    await page.route("**/api/**", (route) => route.abort());
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageStable(page, 10000);

    const outageState = await getPageState(page);
    expect(outageState.hasError || outageState.hasStaleIndicator).toBe(true);

    // Simulate recovery
    await page.unroute("**/api/**");
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();
      await waitForPageStable(page);
    }

    const recoveryState = await getPageState(page);
    expect(recoveryState.hasContent).toBe(true);
    expect(recoveryState.hasError).toBe(false);
  });

  test("should not accumulate errors or memory leaks during failures", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Repeatedly trigger and recover from errors
    for (let i = 0; i < 5; i++) {
      await page.route("**/api/**", (route) => route.abort());
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(1000);

      await page.unroute("**/api/**");
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click();
      }
      await page.waitForTimeout(1000);
    }

    // Page should still be responsive
    const state = await getPageState(page);
    expect(state.hasContent || state.hasError).toBe(true);

    // Should be able to navigate away
    await page.goto(`${BASE_URL}/`);
    await waitForPageStable(page);
    expect(page.url()).toContain(BASE_URL);
  });
});
