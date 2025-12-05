/**
 * Playwright Authentication Setup
 * 
 * Sets up authenticated state for E2E tests.
 * This runs before tests and saves the authenticated state to be reused.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to sign-in page
  await page.goto('/auth/signin');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in credentials from environment variables or use test user
  const email = process.env.E2E_TEST_EMAIL || 'test@example.com';
  const password = process.env.E2E_TEST_PASSWORD || 'testpassword123';

  console.log(`Attempting to sign in with: ${email}`);

  // Fill in the sign-in form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click sign-in button
  await page.click('button[type="submit"]');

  console.log('Submit button clicked, waiting for response...');

  // Wait for either navigation to dashboard or error message
  try {
    await Promise.race([
      // Wait for navigation to dashboard
      page.waitForURL('**/dashboard**', { timeout: 15000 }).then(() => {
        console.log('Navigation to dashboard detected');
      }),
      // Or wait for error to appear
      page.waitForSelector('.bg-red-500\\/10', { timeout: 15000 }).then(async () => {
        const errorText = await page.locator('.bg-red-500\\/10').textContent();
        throw new Error(`Sign in failed with error: ${errorText}`);
      }),
    ]);
  } catch (error: unknown) {
    // Check if we're already on dashboard (navigation succeeded but race failed)
    if (page.url().includes('/dashboard')) {
      console.log('Already on dashboard despite race error');
    } else {
      // Check for error message
      const errorLocator = page.locator('.bg-red-500\\/10');
      if (await errorLocator.count() > 0) {
        const errorText = await errorLocator.textContent();
        throw new Error(`Sign in failed with error: ${errorText}`);
      }
      // Otherwise, provide debugging info
      const currentUrl = page.url();
      console.log(`Current URL after sign-in attempt: ${currentUrl}`);

      // Take a screenshot for debugging
      await page.screenshot({ path: 'playwright-report/auth-failure.png' });

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Sign in failed - did not navigate to dashboard. Current URL: ${currentUrl}. Error: ${errorMessage}`);
    }
  }

  console.log('Successfully navigated to dashboard');

  // Verify we're logged in by checking for authenticated content
  // This could be a user menu, profile icon, or any element that only appears when logged in
  await expect(page.locator('[data-testid="user-menu"], [data-testid="profile"], nav')).toBeVisible({ timeout: 5000 });

  // Save authenticated state
  await page.context().storageState({ path: authFile });

  console.log('Authentication state saved successfully');
});
