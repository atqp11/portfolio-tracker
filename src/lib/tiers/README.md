# User Tier Tracking Module

This module handles user tier management, quota tracking, and usage enforcement for the Portfolio Tracker application.

## Overview

The tier system provides three subscription levels (Free, Basic, Premium) with different limits and features. This module manages **two distinct quota types**: resource quotas (count limits) and AI usage quotas (action limits).

## Module Structure

```
src/lib/tiers/
├── config.ts           # Tier definitions and limits
├── usage-tracker.ts    # Usage tracking and quota enforcement
├── index.ts           # Public API exports
└── README.md          # This file
```

## Quota Types

### ⚠️ Important: Two Different Quota Systems

| Quota Type | What It Limits | Examples |
|------------|----------------|----------|
| **Resource Quota** | How many items you can CREATE | Max portfolios, max stocks |
| **AI Usage Quota** | How many AI-powered ACTIONS | Chat queries, portfolio analysis |

### 1. Resource Quotas (Count Limits)

These enforce the **maximum number** of resources a user can create:

| Resource | Free | Basic | Premium |
|----------|------|-------|---------|
| **Portfolios** | 1 | 5 | Unlimited |
| **Stocks per Portfolio** | 20 | 50 | 150 |

**Middleware:**
- `withPortfolioQuota` - Checks max portfolios allowed (POST only)
- `withStockQuota` - Checks max stocks per portfolio (POST only)

**Where Applied:**
- ✅ POST `/api/portfolio` - Uses `withPortfolioQuota`
- ✅ POST `/api/stocks` - Uses `withStockQuota`
- ❌ PUT/DELETE - No quota check needed (not creating)

### 2. AI Usage Quotas (Daily/Monthly Limits)

These track **usage of AI-powered features** that consume API resources:

| Action | Free | Basic | Premium | Description |
|--------|------|-------|---------|-------------|
| **Chat Queries** | 20/day | 100/day | 700/day | StonksAI chat messages |
| **Portfolio Analysis** | 1/day | 10/day | Unlimited | Deep portfolio analysis |
| **SEC Filings** | 3/month | Unlimited | Unlimited | SEC filing lookups |
| **Portfolio Changes** | 3/day | Unlimited | Unlimited | Batch refresh when portfolio changes |

**Portfolio Change Quota Details:**
A portfolio change is counted when:
1. User opens AI chat (StonksAI component mounts)
2. Current portfolio differs from last successful batch
3. This is NOT the first-time batch (first batch is always free)
4. This is NOT just a cache expiration (expired refresh is free)

Free tier users get 3 portfolio change batch refreshes per day.

**Middleware:**
- `withCacheAndQuota` - For AI chat queries

### What Does NOT Count as AI Usage

Regular operations do **NOT** consume AI quota:
- ❌ Creating portfolios
- ❌ Updating portfolio names
- ❌ Deleting portfolios
- ❌ Adding stocks
- ❌ Updating stock details
- ❌ Removing stocks
- ❌ Viewing portfolios
- ❌ Manual price refresh (unlimited)

## Core Components

### 1. Tier Configuration (`config.ts`)

Defines limits, features, and pricing for each subscription tier:

- **Free Tier**: 1 portfolio, 20 stocks, 20 AI queries/day
- **Basic Tier**: 5 portfolios, 50 stocks, 100 AI queries/day
- **Premium Tier**: Unlimited portfolios, 150 stocks, 700 AI queries/day

### 2. Usage Tracker (`usage-tracker.ts`)

Tracks and enforces AI usage quotas:

- **Actions Tracked**: `chatQuery`, `portfolioAnalysis`, `secFiling`
- **Periods**: Daily (00:00-23:59 UTC) and Monthly (1st-last day UTC)
- **Database**: Stores usage in `usage_tracking` table

## Implementation Details

### Resource Quota Middleware

Applied only to CREATE operations (POST):

```typescript
// Portfolio creation - checks max portfolio count
export const POST = withErrorHandler(
  withAuth(
    withPortfolioQuota(              // ✅ Check: Can user create more portfolios?
      withValidation(schema)(
        (req, ctx) => controller.create(req, ctx)
      )
    )
  )
);

// Stock creation - checks max stocks per portfolio
export const POST = withErrorHandler(
  withAuth(
    withStockQuota(                  // ✅ Check: Can user add more stocks?
      withValidation(schema)(
        (req, ctx) => controller.create(req, ctx)
      )
    )
  )
);

// Update/Delete - no quota check needed
export const PUT = withErrorHandler(
  withAuth(
    withValidation(schema)(
      (req, ctx) => controller.update(req, ctx)  // ❌ No quota middleware
    )
  )
);
```

### AI Usage Quota Middleware

Applied only to actions that trigger AI API calls:

```typescript
// AI Chat - uses chatQuery quota
// Located in: /api/ai/chat
export const POST = withErrorHandler(
  withCacheAndQuota({ quotaType: 'chatQuery' })(
    aiController.chat  // ✅ Track: AI chat query
  )
);

// Portfolio Analysis - uses portfolioAnalysis quota
// Located in: /api/ai/analyze
export const POST = withErrorHandler(
  withAuth(
    withQuotaCheck('portfolioAnalysis')(
      aiController.analyze  // ✅ Track: portfolio analysis
    )
  )
);
```

## Usage Examples

### Checking Quota

```typescript
import { checkQuota } from '@lib/tiers/usage-tracker';

const result = await checkQuota(userId, 'chatQuery', 'free');
// { allowed: true, remaining: 15, limit: 20 }
```

### Tracking Usage

```typescript
import { trackUsage } from '@lib/tiers/usage-tracker';

await trackUsage(userId, 'chatQuery', 'free');
// Increments chat_queries counter in DB
```

### Check and Track (Atomic)

```typescript
import { checkAndTrackUsage } from '@lib/tiers/usage-tracker';

const result = await checkAndTrackUsage(userId, 'chatQuery', 'free');
if (!result.allowed) {
  throw new QuotaExceededError(result.reason);
}
```

## Database Schema

### `usage_tracking` Table

```sql
CREATE TABLE usage_tracking (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  tier TEXT NOT NULL,
  chat_queries INT DEFAULT 0,
  portfolio_analysis INT DEFAULT 0,
  sec_filings INT DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Key Design Decisions

### 1. Separate Resource and AI Quotas

**Critical Understanding:**
- **Resource Quotas** = Limit how many portfolios/stocks you can CREATE
- **AI Usage Quotas** = Limit AI-powered actions that call external APIs

**Why Separate:**
- Portfolio CRUD doesn't call AI APIs → no AI usage consumption
- AI quota only applies to: chatQuery, portfolioAnalysis, secFiling
- Clear mental model for users and developers

### 2. Middleware Over Service Layer

**Rationale:**
- Services should only contain business logic
- Auth and quota concerns belong in middleware
- Consistent with AI chat pattern
- Easier to test and maintain

**Service Layer (Clean Business Logic):**
```typescript
async create(data) {
  const portfolio = await repo.create(data);
  return portfolio; // ✅ Business logic only, no quota tracking
}
```

**Route Layer (Quota Enforcement):**
```typescript
// Resource quota - count check only
export const POST = withPortfolioQuota(handler);

// AI usage quota - for AI-powered actions
export const POST = withCacheAndQuota({ quotaType: 'chatQuery' })(handler);
```

### 3. Atomic Check-and-Track

**Rationale:**
- Prevents race conditions
- Ensures quota is checked before consumption
- Single database transaction

```typescript
// Atomic operation
const result = await checkAndTrackUsage(userId, action, tier);
```

### 4. Silent Failures for Tracking

**Rationale:**
- User operations should succeed even if tracking fails
- Prevents quota bugs from breaking core features
- Errors logged for monitoring

### 5. Configuration-Driven Tiers

**Rationale:**
- Easy to adjust limits without code changes
- Tier-specific behavior via flags
- A/B testing different quota levels

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Quota middleware tests
npm test -- quota.test.ts
```

### Test Results

```
✓ Quota Middleware Tests (4/4)

Test Suites: 29 passed, 29 total
Tests: 243 passed, 243 total
```

## API Reference

### `getTierConfig(tier: TierName)`

Get configuration for a specific tier.

```typescript
const config = getTierConfig('free');
// Returns: TierLimits object with all limits and features
```

### `checkQuota(userId, action, tier)`

Check if user has remaining quota (read-only).

```typescript
const result = await checkQuota('user-123', 'chatQuery', 'free');
// Returns: { allowed: boolean, remaining: number, limit: number, reason?: string }
```

### `trackUsage(userId, action, tier)`

Increment usage counter (write operation).

```typescript
await trackUsage('user-123', 'chatQuery', 'free');
// Returns: void
```

### `checkAndTrackUsage(userId, action, tier)`

Atomically check and track usage.

```typescript
const result = await checkAndTrackUsage('user-123', 'chatQuery', 'free');
// Returns: { allowed: boolean, reason?: string }
```

### `getUserUsage(userId, tier)`

Get detailed usage statistics for a user.

```typescript
const usage = await getUserUsage('user-123', 'free');
// Returns: { daily: {...}, monthly: {...}, periodStart: {...}, periodEnd: {...} }
```

### `getUsageStats(userId, tier)`

Get usage statistics with percentages and warnings.

```typescript
const stats = await getUsageStats('user-123', 'free');
// Returns: { tier, usage, percentages, warnings }
```

## Middleware Reference

### `withPortfolioQuota()`

Middleware to check portfolio count limits.

**Used For:**
- Creating new portfolios (POST only)

```typescript
withPortfolioQuota(handler)
```

### `withStockQuota()`

Middleware to check stock count limits per portfolio.

**Used For:**
- Adding new stocks (POST only)

```typescript
withStockQuota(handler)
```

## Future Enhancements

1. **Usage Dashboard UI**
   - Real-time quota display
   - Visual progress bars
   - Warning notifications at 80% usage

2. **Analytics and Monitoring**
   - Track operation patterns
   - Identify users hitting limits
   - Optimize quota allocations

## Related Documentation

- [Tier System Overview](../../../docs/3_Architecture/TECHNICAL_ARCHITECTURE_OVERVIEW.md)
- [Quota Middleware](../../backend/common/middleware/quota.middleware.ts)
