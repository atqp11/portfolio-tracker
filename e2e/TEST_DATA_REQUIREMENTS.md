# E2E Test Data Requirements

This document specifies the test data required for different E2E test suites.

## Test Suite Overview

| Test Suite | File | Data Requirements |
|------------|------|-------------------|
| Empty State Tests | `empty-state.spec.ts` | **NO portfolios** (clean user) |
| Error Scenario Tests | `error-scenarios.spec.ts` | **Populated portfolio** with stocks |

---

## Empty State Tests (`empty-state.spec.ts`)

**Purpose:** Validate onboarding experience and empty state handling

**Required Test User State:**
- ✅ Authenticated user
- ❌ NO portfolios
- ❌ NO stocks

**Setup Instructions:**
1. Create new test user OR delete all portfolios from existing user
2. User should see "Welcome to Portfolio Tracker" message on dashboard

**What Gets Tested:**
- Empty state message displays correctly
- Navigation remains functional
- Create portfolio CTA works
- No crashes when accessing routes that require data
- Responsive design in empty state
- Loading states for empty results

---

## Error Scenario Tests (`error-scenarios.spec.ts`)

**Purpose:** Validate graceful degradation and error handling with real data

**Required Test User State:**
- ✅ Authenticated user
- ✅ At least 1 portfolio
- ✅ At least 3-5 stocks in portfolio

**Recommended Test Data:**

### Portfolio
```
Name: "Test Portfolio"
Type: "stocks" (or any type)
Borrowed Amount: 0 (optional: set to test margin)
```

### Stocks (minimum 3-5 holdings)
```javascript
[
  { symbol: "AAPL", shares: 10, costBasis: 150 },
  { symbol: "MSFT", shares: 5, costBasis: 300 },
  { symbol: "GOOGL", shares: 2, costBasis: 2500 },
  { symbol: "TSLA", shares: 3, costBasis: 200 },
  { symbol: "NVDA", shares: 4, costBasis: 400 },
]
```

**Setup Instructions:**

### Option A: Manual Setup (via UI)
1. Sign in as test user
2. Click "Create Your First Portfolio"
3. Add 3-5 stocks using "Add Stock" button
4. Ensure stocks have price data loaded

### Option B: Automated Setup (via API/Script)
```typescript
// Create portfolio
POST /api/portfolio
{
  "name": "Test Portfolio",
  "type": "stocks"
}

// Add stocks
POST /api/stocks
{
  "portfolioId": "<portfolio-id>",
  "symbol": "AAPL",
  "shares": 10,
  "costBasis": 150
}
// Repeat for other stocks...
```

### Option C: Database Seeding (SQL)
```sql
-- Insert portfolio
INSERT INTO portfolios (user_id, name, type)
VALUES ('<user-id>', 'Test Portfolio', 'stocks')
RETURNING id;

-- Insert stocks
INSERT INTO stocks (portfolio_id, symbol, shares, cost_basis, current_price, actual_value)
VALUES
  ('<portfolio-id>', 'AAPL', 10, 150, 175, 1750),
  ('<portfolio-id>', 'MSFT', 5, 300, 350, 1750),
  ('<portfolio-id>', 'GOOGL', 2, 2500, 2800, 5600),
  ('<portfolio-id>', 'TSLA', 3, 200, 180, 540),
  ('<portfolio-id>', 'NVDA', 4, 400, 500, 2000);
```

**What Gets Tested:**
- Cache failure scenarios with real data
- Provider failures and fallbacks
- Circuit breaker behavior
- Slow API responses
- Partial data loading
- Error recovery with actual stocks
- Navigation between portfolio views

**Routes That Must Work:**
- `/dashboard` - Shows portfolio summary
- `/dashboard/stocks` - Lists all stocks (if route exists)
- `/dashboard/stocks/AAPL` - Individual stock detail (if route exists)
- `/dashboard/quote?symbol=AAPL` - Quote page (if route exists)
- `/dashboard/risk` - Risk metrics (if route exists)
- `/fundamentals` - Fundamentals page (if route exists)

---

## Test User Management

### Current Test User Credentials
```bash
# From .env.local
E2E_TEST_EMAIL=amira2@gmail.com
E2E_TEST_PASSWORD=<from-env-file>
```

### Creating Additional Test Users

**For Empty State Tests:**
```bash
# Create new user with no data
E2E_EMPTY_USER_EMAIL=test-empty@example.com
E2E_EMPTY_USER_PASSWORD=testpassword123

# Run: npx tsx scripts/create-test-user.ts
```

**For Populated Tests:**
```bash
# Use existing user or create new one
E2E_POPULATED_USER_EMAIL=test-populated@example.com
E2E_POPULATED_USER_PASSWORD=testpassword123

# After creation, add portfolio + stocks via UI or script
```

---

## Running Specific Test Suites

### Run Empty State Tests Only
```bash
npm run e2e -- empty-state.spec.ts
```

### Run Error Scenario Tests Only
```bash
npm run e2e -- error-scenarios.spec.ts
```

### Run All Tests (requires BOTH data states)
```bash
# NOT RECOMMENDED - tests require different user states
npm run e2e
```

---

## Test Data Cleanup

### After Testing
- Empty state tests: No cleanup needed (user has no data)
- Error scenario tests: Optionally delete test portfolio to reset

### Reset Test User
```sql
-- Delete all portfolios (cascades to stocks)
DELETE FROM portfolios WHERE user_id = '<test-user-id>';

-- Or delete entire test user
DELETE FROM auth.users WHERE email = 'test@example.com';
```

---

## Troubleshooting

### "Test user has no portfolios" but error-scenarios.spec.ts is running
❌ Wrong user state for test suite
✅ Create portfolio with stocks OR run empty-state.spec.ts instead

### "Welcome to Portfolio Tracker" shows but expecting stock data
❌ Portfolio not created or stocks not added
✅ Follow "Automated Setup" instructions above

### Tests timeout waiting for elements
❌ Routes don't exist or data not loading
✅ Check:
  1. Dev server is running (`npm run dev`)
  2. Database has test data
  3. API endpoints return data successfully

### Some tests pass, others fail in same suite
❌ Inconsistent test data
✅ Ensure ALL required stocks are added to portfolio

---

## Future Test Suites (When Created)

### Happy Path / User Flows (`user-flows.spec.ts`)
**Purpose:** Test complete user journeys through the app

**Required Data:**
- Fresh test user (can be empty initially)
- Tests will create data as part of flow

**Test Scenarios:**
- New user onboarding: Sign up → Create portfolio → Add stocks
- Portfolio management: Create → Edit → Delete
- Stock operations: Add → Edit price → View details → Delete
- Settings: Update profile, change tier, manage preferences

---

### Performance Tests (`performance.spec.ts`)
**Purpose:** Validate page load times and responsiveness

**Required Data:**
- Portfolio with 50+ stocks (large dataset)
- Historical price data

**Test Scenarios:**
- Dashboard load time under 3 seconds
- Stock list renders within 2 seconds
- Infinite scroll performance
- Real-time price updates don't freeze UI

---

### Authentication Flows (`auth-flows.spec.ts`)
**Purpose:** Test sign-in, sign-up, password reset

**Required Data:**
- No data needed (creates/deletes test users dynamically)

**Test Scenarios:**
- Sign up with valid credentials
- Sign in with existing user
- Sign out and verify session cleared
- Password reset flow
- OAuth (Google Sign-In)

---

### Multi-Portfolio Tests (`multi-portfolio.spec.ts`)
**Purpose:** Test switching between portfolios, cross-portfolio operations

**Required Data:**
- User with 3+ portfolios
- Each portfolio has different types (stocks, crypto, mixed)
- 5+ stocks in each portfolio

**Test Scenarios:**
- Switch between portfolios smoothly
- Portfolio selector shows all portfolios
- Correct data displays for each portfolio
- Theme changes per portfolio

---

### Mobile Responsive Tests (`mobile.spec.ts`)
**Purpose:** Validate mobile viewport behavior

**Required Data:**
- Same as error-scenarios.spec.ts (populated portfolio)

**Test Scenarios:**
- Navigation drawer on mobile
- Touch interactions (swipe, tap, pinch-zoom)
- Forms usable on small screens
- Tables scroll horizontally
- Charts resize appropriately

---

## Automated Data Seeding (Recommended Implementation)

### Setup File: `e2e/data.setup.ts`
```typescript
import { test as setup } from '@playwright/test';

setup('seed-test-data', async ({ request }) => {
  const apiBase = process.env.E2E_TEST_URL || 'http://localhost:3000';
  
  // Get auth token from saved session
  const authState = JSON.parse(
    await fs.readFile('./playwright/.auth/user.json', 'utf-8')
  );
  const cookies = authState.cookies;
  
  // Create portfolio
  const portfolioRes = await request.post(`${apiBase}/api/portfolio`, {
    headers: { Cookie: cookies },
    data: {
      name: 'E2E Test Portfolio',
      type: 'stocks',
    },
  });
  const portfolio = await portfolioRes.json();
  
  // Add stocks
  const stocks = [
    { symbol: 'AAPL', shares: 10, costBasis: 150 },
    { symbol: 'MSFT', shares: 5, costBasis: 300 },
    { symbol: 'GOOGL', shares: 2, costBasis: 2500 },
  ];
  
  for (const stock of stocks) {
    await request.post(`${apiBase}/api/stocks`, {
      headers: { Cookie: cookies },
      data: { portfolioId: portfolio.id, ...stock },
    });
  }
  
  console.log('Test data seeded successfully');
});
```

### Update `playwright.config.ts`
```typescript
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  { name: "data-seed", testMatch: /data\.setup\.ts/, dependencies: ["setup"] },
  {
    name: "chromium",
    use: { storageState: "./playwright/.auth/user.json" },
    dependencies: ["data-seed"],
  },
]
```

---

## Multiple User Profiles

### Environment Variables
```bash
# Empty state user
E2E_EMPTY_USER_EMAIL=test-empty@example.com
E2E_EMPTY_USER_PASSWORD=testpassword123

# Basic user (1 portfolio, few stocks)
E2E_BASIC_USER_EMAIL=test-basic@example.com
E2E_BASIC_USER_PASSWORD=testpassword123

# Advanced user (multiple portfolios, many stocks)
E2E_ADVANCED_USER_EMAIL=test-advanced@example.com
E2E_ADVANCED_USER_PASSWORD=testpassword123
```

### Multiple Auth States
```typescript
// auth.setup.ts - Create separate storage states
setup('auth-empty', async ({ page }) => {
  await signIn(page, process.env.E2E_EMPTY_USER_EMAIL);
  await page.context().storageState({ path: './playwright/.auth/empty.json' });
});

setup('auth-basic', async ({ page }) => {
  await signIn(page, process.env.E2E_BASIC_USER_EMAIL);
  await page.context().storageState({ path: './playwright/.auth/basic.json' });
});
```

### Use in Tests
```typescript
// empty-state.spec.ts
test.use({ storageState: './playwright/.auth/empty.json' });

// error-scenarios.spec.ts  
test.use({ storageState: './playwright/.auth/basic.json' });
```

---

## Data Fixtures

### Create Fixtures Directory
```typescript
// e2e/fixtures/portfolios.ts
export const BASIC_PORTFOLIO = {
  name: "Test Portfolio",
  type: "stocks" as const,
  stocks: [
    { symbol: "AAPL", shares: 10, costBasis: 150 },
    { symbol: "MSFT", shares: 5, costBasis: 300 },
    { symbol: "GOOGL", shares: 2, costBasis: 2500 },
  ],
};

export const LARGE_PORTFOLIO = {
  name: "Large Test Portfolio",
  type: "stocks" as const,
  stocks: Array.from({ length: 50 }, (_, i) => ({
    symbol: `STOCK${i}`,
    shares: Math.floor(Math.random() * 100),
    costBasis: Math.floor(Math.random() * 500),
  })),
};

export const MULTI_PORTFOLIO_SET = [
  { name: "Growth Portfolio", type: "stocks", stocks: [/* ... */] },
  { name: "Value Portfolio", type: "stocks", stocks: [/* ... */] },
  { name: "Crypto Portfolio", type: "crypto", stocks: [/* ... */] },
];
```

### Use Fixtures in Tests
```typescript
import { BASIC_PORTFOLIO } from './fixtures/portfolios';

test('should create portfolio from fixture', async ({ page }) => {
  await createPortfolioFromFixture(page, BASIC_PORTFOLIO);
  // Test continues with known data state...
});
```
