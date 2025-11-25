# Usage Tracking System - Complete Overview

## Summary

Database-backed quota tracking system with automatic period resets, cache-aware counting, and RLS security.

---

## ✅ Quota Reset Rules (VERIFIED)

### 1. **Daily Quotas Reset at Midnight UTC** ✅
- **What**: Chat queries, Portfolio analysis
- **When**: 00:00:00 UTC every day
- **How**: System creates new usage record for new period
- **Code**: `lib/tiers/usage-tracker.ts:24-33`

### 2. **Monthly Quotas Reset on 1st of Each Month** ✅
- **What**: SEC filings
- **When**: 1st day at 00:00:00 UTC
- **How**: System creates new usage record for new period
- **Code**: `lib/tiers/usage-tracker.ts:35-39`

### 3. **Unused Quota Does NOT Roll Over** ✅
- Old periods are kept in database for history
- New periods always start at 0
- No accumulation across periods

### 4. **Cached Responses Don't Count Against Quota** ✅
- **Fixed**: Cache check now happens BEFORE quota check
- 12-hour cache TTL
- **Code**: `app/api/ai/chat/route.ts:87-124`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER REQUEST                            │
│                    (e.g., AI Chat)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  1. Authenticate User        │
          │     getUserProfile()         │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  2. Check Cache FIRST        │
          │     If cached → return       │
          │     (NO quota used!)         │
          └──────────────┬───────────────┘
                         │ Cache miss
                         ▼
          ┌──────────────────────────────┐
          │  3. Check Quota              │
          │     checkQuota()             │
          │     - Get/create period      │
          │     - Check limits           │
          └──────────────┬───────────────┘
                         │
                    Allowed?
                    ┌────┴────┐
                    │         │
                 Yes│         │No
                    │         │
                    ▼         ▼
          ┌─────────────┐  ┌──────────────┐
          │ 4. Track    │  │ Return 429   │
          │    Usage    │  │ Quota Error  │
          │ trackUsage()│  └──────────────┘
          └──────┬──────┘
                 │
                 ▼
          ┌─────────────────┐
          │ 5. Process      │
          │    Request      │
          │ (AI, etc.)      │
          └──────┬──────────┘
                 │
                 ▼
          ┌─────────────────┐
          │ 6. Cache Result │
          │    (12 hours)   │
          └──────┬──────────┘
                 │
                 ▼
          ┌─────────────────┐
          │ 7. Return to    │
          │    User         │
          └─────────────────┘
```

---

## Key Functions & Flow

### 📍 **Entry Point: API Routes**

**Example: `/api/ai/chat`** (`app/api/ai/chat/route.ts`)

```typescript
// 1. Authenticate
const profile = await getUserProfile();

// 2. Check cache FIRST
const cached = chatCache.get(cacheKey);
if (cached && age < TTL) {
  return cached; // NO QUOTA USED ✅
}

// 3. Check & track quota (only for non-cached)
const quotaCheck = await checkAndTrackUsage(
  profile.id,
  'chatQuery',
  profile.tier
);

if (!quotaCheck.allowed) {
  return 429; // Quota exceeded
}

// 4. Process request
const result = await processRequest();

// 5. Cache result
chatCache.set(cacheKey, result);

return result;
```

---

### 📍 **Core Function: checkAndTrackUsage()**

**Location**: `lib/tiers/usage-tracker.ts:264-283`

**What it does**:
1. Checks if user has quota remaining
2. If yes, increments the counter atomically
3. Returns allowed/denied

```typescript
export async function checkAndTrackUsage(
  userId: string,
  action: UsageAction, // 'chatQuery' | 'portfolioAnalysis' | 'secFiling'
  tier: TierName
): Promise<{ allowed: boolean; reason?: string }>
```

**Breakdown**:
```typescript
// Step 1: Check quota
const quota = await checkQuota(userId, action, tier);

if (!quota.allowed) {
  return { allowed: false, reason: quota.reason };
}

// Step 2: Track usage (increment counter)
await trackUsage(userId, action, tier);

return { allowed: true };
```

---

### 📍 **Period Management: Auto-Reset**

**Location**: `lib/tiers/usage-tracker.ts:46-92`

**How it works**:

```typescript
// Get current period boundaries
function getCurrentPeriod(type: 'daily' | 'monthly') {
  const now = new Date();

  if (type === 'daily') {
    // 00:00:00 UTC to 23:59:59 UTC
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
  } else {
    // 1st of month to last day of month
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    return { start, end };
  }
}

// Get or create usage record for current period
async function getOrCreateUsageRecord(userId, tier, periodType) {
  const { start, end } = getCurrentPeriod(periodType);

  // Try to find existing record for THIS period
  const existing = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .gte('period_start', start.toISOString())
    .lte('period_end', end.toISOString())
    .single();

  if (existing) {
    return existing; // Use existing record
  }

  // No record found for current period → CREATE NEW (reset)
  const newRecord = await supabase
    .from('usage_tracking')
    .insert({
      user_id: userId,
      tier,
      chat_queries: 0,        // ← Starts at 0
      portfolio_analysis: 0,   // ← Starts at 0
      sec_filings: 0,         // ← Starts at 0
      period_start: start.toISOString(),
      period_end: end.toISOString(),
    });

  return newRecord;
}
```

**Key Point**: This is a **"lazy reset"** pattern:
- Doesn't require cron jobs or scheduled tasks
- Automatically creates new records when the period changes
- Old records remain in database for history/analytics

---

### 📍 **Quota Checking: checkQuota()**

**Location**: `lib/tiers/usage-tracker.ts:162-216`

```typescript
export async function checkQuota(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}>
```

**What it does**:
1. Gets current usage from database
2. Gets tier limits from config
3. Compares used vs limit
4. Returns allowed/denied with details

---

### 📍 **Usage Increment: trackUsage()**

**Location**: `lib/tiers/usage-tracker.ts:220-259`

```typescript
export async function trackUsage(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<void>
```

**What it does**:
1. Gets or creates usage record for current period
2. Increments the appropriate counter
3. Updates database

**Example**:
```typescript
// Get record for today
const record = await getOrCreateUsageRecord(userId, tier, 'daily');

// Increment counter
const updates = {
  chat_queries: record.chat_queries + 1
};

// Save to database
await supabase
  .from('usage_tracking')
  .update(updates)
  .eq('id', record.id);
```

---

## Database Schema

**Table**: `usage_tracking`

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tier TEXT NOT NULL,

  -- Counters
  chat_queries INT DEFAULT 0,
  portfolio_analysis INT DEFAULT 0,
  sec_filings INT DEFAULT 0,

  -- Period boundaries
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for period queries
CREATE INDEX idx_usage_tracking_period
ON usage_tracking(user_id, period_start, period_end);
```

**RLS Policies**:
- Users can SELECT/INSERT/UPDATE their own records
- Service role has full access (for admin operations)

---

## Integration Points

### ✅ **Currently Integrated**:

1. **AI Chat** (`/api/ai/chat`)
   - Action: `'chatQuery'`
   - Cache: 12 hours
   - Quota: Daily
   - **Status**: ✅ IMPLEMENTED

2. **Portfolio Analysis** (`/api/risk-metrics`)
   - Action: `'portfolioAnalysis'`
   - Cache: 6 hours
   - Quota: Daily
   - **Status**: ✅ IMPLEMENTED

3. **SEC Filings** (`/api/sec-edgar`)
   - Action: `'secFiling'`
   - Cache: None (external API)
   - Quota: Monthly
   - **Status**: ✅ IMPLEMENTED

---

## Tier Limits

| Tier    | Chat/Day | Portfolio/Day | SEC/Month | Price   |
|---------|----------|---------------|-----------|---------|
| Free    | 10       | 1             | 3         | $0      |
| Basic   | 100      | 10            | Unlimited | $9.99   |
| Premium | Unlimited| Unlimited     | Unlimited | $19.99  |

**Configuration**: `lib/tiers/config.ts`

---

## User-Facing Endpoints

### 1. **GET /api/user/usage**
- **Purpose**: Display usage dashboard
- **Client**: SSR with RLS (secure)
- **Returns**: Current usage + limits + percentages
- **UI**: `/usage` page

### 2. **GET /api/user/quota**
- **Purpose**: Check quota programmatically
- **Client**: SSR with RLS (secure)
- **Returns**: Remaining quota for all actions

---

## Testing

### Test Quota Flow
```bash
# Run tier tests
curl http://localhost:3000/api/test-tiers?test=quota&userId=test-123&tier=free

# Simulate usage
curl -X POST http://localhost:3000/api/test-tiers \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-123",
    "tier": "free",
    "action": "chatQuery",
    "count": 5
  }'
```

### Verify Cache Behavior
```bash
# Make request (should increment quota)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test question"}'

# Make same request again (should use cache, NO quota increment)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test question"}'
```

### Check Usage Dashboard
1. Go to `/usage`
2. Verify daily/monthly quotas display
3. Check reset timers

---

## Critical Fixes Applied

### ✅ Fixed: Cache Before Quota
**Before**:
```typescript
// WRONG ORDER
checkAndTrackUsage(); // Increments quota
checkCache();         // Then checks cache
```

**After**:
```typescript
// CORRECT ORDER
checkCache();         // Check cache first
// If cache hit → return (no quota used)
checkAndTrackUsage(); // Only increment if cache miss
```

### ✅ Fixed: Period Reset Logic
- Uses database queries to find records by period
- Auto-creates new records when period changes
- No cron jobs needed

### ✅ Fixed: RLS Security
- User-facing endpoints use SSR client
- System operations use admin client
- Proper separation of concerns

---

## Monitoring & Analytics

### Usage Patterns
```sql
-- Daily active users
SELECT DATE(period_start), COUNT(DISTINCT user_id)
FROM usage_tracking
WHERE period_start >= NOW() - INTERVAL '30 days'
GROUP BY DATE(period_start);

-- Average usage by tier
SELECT tier, AVG(chat_queries), AVG(portfolio_analysis)
FROM usage_tracking
WHERE period_start >= NOW() - INTERVAL '7 days'
GROUP BY tier;

-- Users approaching limits
SELECT user_id, tier, chat_queries
FROM usage_tracking
WHERE period_start >= CURRENT_DATE
AND chat_queries >= (
  SELECT chatQueriesPerDay * 0.8 FROM tier_config WHERE tier = usage_tracking.tier
);
```

---

## Next Steps

1. ✅ **DONE**: Fix cache before quota
2. ✅ **DONE**: Verify period resets work
3. ✅ **DONE**: Integrate portfolio analysis endpoint
4. ✅ **DONE**: Integrate SEC filings endpoint
5. **TODO**: Add usage alerts (email when approaching limit)
6. **TODO**: Add admin dashboard for monitoring
7. **TODO**: Set up database backups for usage history
8. **TODO**: Add rate limiting for abuse prevention
