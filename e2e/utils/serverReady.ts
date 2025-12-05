import type { Page } from '@playwright/test';

/**
 * Wait for the server at baseUrl to respond with ok status using Playwright's request API on the page context.
 * Polls until timeoutMs is reached.
 */
export async function waitForServer(page: Page, baseUrl: string, timeoutMs = 60_000, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs;
  const url = baseUrl || 'http://localhost:3000/';

  while (Date.now() < deadline) {
    try {
      const res = await page.request.get(url, { timeout: 5000 });
      if (res && res.status() >= 200 && res.status() < 400) {
        return true;
      }
    } catch (err) {
      // ignore and retry
    }
    await page.waitForTimeout(intervalMs);
  }

  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}
