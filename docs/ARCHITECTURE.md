# Portfolio Tracker - Usage & Tier System Architecture

**Complete design documentation for tier management, usage tracking, and quota enforcement**

---

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Client Architecture (SSR vs Admin)](#client-architecture-ssr-vs-admin)
4. [Tier System](#tier-system)
5. [Usage Tracking](#usage-tracking)
6. [Quota Enforcement](#quota-enforcement)
7. [Request Flow](#request-flow)
8. [Database Schema](#database-schema)
9. [Security Model](#security-model)
10. [Caching Strategy](#caching-strategy)
11. [API Reference](#api-reference)
12. [Testing](#testing)

---

## Overview

The Portfolio Tracker implements a three-tier subscription system with database-backed usage tracking and intelligent quota enforcement. The system ensures fair resource allocation while providing a smooth user experience through smart caching and automatic period resets.

### Design Principles

1. **Database-backed**: All usage data persists in Supabase (no in-memory storage)
2. **Cache-first**: Cached responses don't count against quotas
3. **Lazy resets**: Period boundaries handled automatically without cron jobs
4. **RLS security**: User-facing operations use Row Level Security
5. **Reliable tracking**: System operations bypass RLS using admin client

---

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Application                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  User Dashboard │         │   API Endpoints  │          │
│  │   (/usage)      │         │  - /ai/chat      │          │
│  │   (/quota)      │         │  - /risk-metrics │          │
│  └────────┬────────┘         │  - /sec-edgar    │          │
│           │                  └─────────┬────────┘          │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌──────────────────────────────────────────────┐          │
│  │           Client Layer (Supabase)            │          │
│  ├──────────────────────────────────────────────┤          │
│  │  SSR Client        │     Admin Client        │          │
│  │  (RLS Protected)   │     (Bypass RLS)        │          │
│  └────────┬───────────┴───────────┬─────────────┘          │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────────────────────────────────┐           │
│  │            Database (Supabase)               │           │
│  │  - profiles                                  │           │
│  │  - usage_tracking                            │           │
│  │  - portfolios                                │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Tier Config** | `lib/tiers/config.ts` | Defines subscription tiers and limits |
| **Usage Tracker** | `lib/tiers/usage-tracker.ts` | Core quota logic (admin client) |
| **DB Helpers** | `lib/supabase/db.ts` | RLS-protected database queries |
| **SSR Client** | `lib/supabase/server.ts` | User-scoped Supabase client |
| **Admin Client** | `lib/supabase/admin.ts` | System-level Supabase client |
| **Session** | `lib/auth/session.ts` | User authentication |

---

## Client Architecture (SSR vs Admin)

### Two Client Types

The application uses two types of Supabase clients, each for different purposes:

#### 1. SSR Client (Server-Side Rendering)

**File**: `lib/supabase/server.ts`

**Purpose**: User-facing operations with Row Level Security

**Characteristics**:
```typescript
import { createServerClient } from '@supabase/ssr';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,  // ← Anon/Public key
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookies) { /* ... */ }
      }
    }
  );
}
```

**Key Points**:
- Uses **anon/public key** (not service role key)
- **Respects RLS policies** - queries filtered by auth.uid()
- Works with **user sessions** via cookies
- Operations are **scoped to authenticated user**
- Used for user-facing database operations

**When to Use**:
- Reading user's own data
- Updating user's own data
- Dashboard queries
- Any operation that should respect user permissions

**Example Use Cases**:
```typescript
// User can only see their own usage
const usage = await supabase
  .from('usage_tracking')
  .select('*')
  .eq('user_id', userId);  // RLS also enforces this!
```

---

#### 2. Admin Client (Service Role)

**File**: `lib/supabase/admin.ts`

**Purpose**: System-level operations that bypass Row Level Security

**Characteristics**:
```typescript
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,  // ← Service role key (secret!)
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
}
```

**Key Points**:
- Uses **service role key** (full database access)
- **Bypasses ALL RLS policies**
- No user session required
- Unrestricted database access
- NEVER expose to client-side code

**When to Use**:
- Usage tracking (needs to work reliably)
- Quota enforcement (system operation)
- Admin operations
- Background jobs
- Any operation that needs to bypass user-level restrictions

**Example Use Cases**:
```typescript
// Can read/update ANY user's usage
const usage = await supabase
  .from('usage_tracking')
  .update({ chat_queries: count })
  .eq('user_id', anyUserId);  // Works for any user!
```

---

### Client Selection Matrix

| Operation | Client Type | Why |
|-----------|-------------|-----|
| Display usage dashboard | SSR | User should only see their own data |
| Check user's quota | SSR | User-facing, respects RLS |
| Track usage after action | Admin | System operation, must be reliable |
| Increment usage counter | Admin | Must bypass RLS for accuracy |
| Read user profile | SSR | User's own data |
| Admin panel queries | Admin | Need to see all users |

---

### Row Level Security (RLS)

**What is RLS?**

Row Level Security is PostgreSQL's built-in feature to restrict which rows users can see/modify based on policies.

**Example Policy**:
```sql
-- Users can only view their own usage
CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access"
  ON usage_tracking FOR ALL
  USING (true);  -- Service role bypasses RLS anyway
```

**How It Works**:

```
SSR Client Query:
┌──────────────────────────────────────────┐
│ SELECT * FROM usage_tracking             │
│ WHERE user_id = 'abc123'                 │
└──────────────────┬───────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   RLS Policy Check   │
        │  auth.uid() = 'abc123'│
        │  user_id = 'abc123'  │
        │  ✅ MATCH            │
        └──────────┬───────────┘
                   │
                   ▼
           Returns matching rows


Admin Client Query:
┌──────────────────────────────────────────┐
│ SELECT * FROM usage_tracking             │
│ WHERE user_id = 'xyz789'                 │
└──────────────────┬─────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   RLS Policy Check   │
        │   ⚠️ BYPASSED        │
        │   (Service role key) │
        └──────────┬───────────┘
                   │
                   ▼
           Returns all matching rows
```

**Why Bypass RLS for Usage Tracking?**

1. **Reliability**: Quota tracking must work even if RLS policies change
2. **Accuracy**: System needs to increment counters regardless of user context
3. **Background jobs**: May run without user session
4. **Consistency**: One source of truth for all tracking

---

## Tier System

### Three Subscription Tiers

**Configuration**: `lib/tiers/config.ts`

```typescript
export type TierName = 'free' | 'basic' | 'premium';
```

### Tier Comparison

| Feature | Free | Basic | Premium |
|---------|------|-------|---------|
| **Price** | $0/mo | $9.99/mo | $19.99/mo |
| **Chat Queries** | 10/day | 100/day | Unlimited |
| **Portfolio Analysis** | 1/day | 10/day | Unlimited |
| **SEC Filings** | 3/month | Unlimited | Unlimited |
| **Portfolios** | 1 | 3 | Unlimited |
| **Stocks per Portfolio** | 10 | 50 | Unlimited |
| **AI Model** | Flash | Flash Pro | Flash Pro Priority |
| **Support** | Community | Email (48hr) | Priority (24hr) |

### Technical Limits

```typescript
export interface TierLimits {
  // Pricing
  price: number;
  priceDisplay: string;

  // Portfolio Limits
  maxPortfolios: number;
  maxStocksPerPortfolio: number;

  // AI Usage Limits (Daily)
  chatQueriesPerDay: number;
  portfolioAnalysisPerDay: number;
  concurrentRequests: number;

  // Data Access Limits (Monthly)
  secFilingsPerMonth: number;
  newsUpdatesFrequency: string;

  // AI Model Configuration
  aiModel: 'flash' | 'flash-pro' | 'flash-pro-priority';
  allowAiEscalation: boolean;
  priorityRouting: boolean;

  // Feature Access
  features: { /* ... */ };

  // Support Level
  support: 'community' | 'email' | 'priority';
  supportResponseTime: string;

  // Cost Analysis
  estimatedMonthlyCost: number;
  grossMargin: number;
}
```

### Accessing Tier Config

```typescript
import { getTierConfig } from '@lib/tiers';

const config = getTierConfig('free');
console.log(config.chatQueriesPerDay); // 10
```

---

## Usage Tracking

### Database-Backed Tracking

All usage is stored in the `usage_tracking` table with period boundaries:

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
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
```

### Period Management

**Lazy Reset Pattern**: No cron jobs needed!

```typescript
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
    const start = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    ));
    const end = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      0, 23, 59, 59, 999
    ));

    return { start, end };
  }
}
```

**How Reset Works**:

```
User makes first request of new day:

1. Query: Find record where period = today
   SELECT * FROM usage_tracking
   WHERE user_id = 'abc'
     AND period_start >= '2025-01-25T00:00:00Z'
     AND period_end <= '2025-01-25T23:59:59Z'

2. No record found? → Create new record
   INSERT INTO usage_tracking (
     user_id, tier,
     chat_queries, portfolio_analysis, sec_filings,
     period_start, period_end
   ) VALUES (
     'abc', 'free',
     0, 0, 0,  -- ← Counters start at 0
     '2025-01-25T00:00:00Z',
     '2025-01-25T23:59:59Z'
   )

3. This IS the reset! Old periods remain for history.
```

### Usage Actions

```typescript
export type UsageAction =
  | 'chatQuery'          // Daily quota
  | 'portfolioAnalysis'  // Daily quota
  | 'secFiling';         // Monthly quota
```

### Core Functions

#### 1. Check Quota

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
- Gets current usage from database
- Gets tier limits from config
- Compares used vs limit
- Returns allowed/denied

**Example**:
```typescript
const quota = await checkQuota('user123', 'chatQuery', 'free');
// {
//   allowed: true,
//   remaining: 7,
//   limit: 10,
//   reason: undefined
// }
```

#### 2. Track Usage

```typescript
export async function trackUsage(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<void>
```

**What it does**:
- Gets or creates usage record for current period
- Increments the appropriate counter
- Updates database

**Example**:
```typescript
await trackUsage('user123', 'chatQuery', 'free');
// Updates: chat_queries = chat_queries + 1
```

#### 3. Check and Track (Atomic)

```typescript
export async function checkAndTrackUsage(
  userId: string,
  action: UsageAction,
  tier: TierName
): Promise<{ allowed: boolean; reason?: string }>
```

**What it does**:
- Checks quota
- If allowed, tracks usage
- Returns single result

**Example**:
```typescript
const result = await checkAndTrackUsage('user123', 'chatQuery', 'free');

if (!result.allowed) {
  return res.status(429).json({
    error: 'Quota exceeded',
    reason: result.reason
  });
}
```

---

## Quota Enforcement

### Integration Pattern

**Standard API endpoint pattern**:

```typescript
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const body = await req.json();

  // 1. Authenticate
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // 2. Check cache FIRST (if applicable)
  const cacheKey = generateCacheKey(body);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < TTL) {
    console.log('♻️ Cache hit - NO QUOTA USED');
    return NextResponse.json(cached.data);
  }

  // 3. Check and track quota (only for cache miss)
  const quotaCheck = await checkAndTrackUsage(
    profile.id,
    'chatQuery',  // or 'portfolioAnalysis' or 'secFiling'
    profile.tier as TierName
  );

  if (!quotaCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        reason: quotaCheck.reason,
        upgradeUrl: '/pricing'
      },
      { status: 429 }
    );
  }

  // 4. Process request
  const result = await processRequest(body);

  // 5. Cache result (if applicable)
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  // 6. Return result
  return NextResponse.json(result);
}
```

### Integrated Endpoints

| Endpoint | Action | Quota | Cache | Status |
|----------|--------|-------|-------|--------|
| `/api/ai/chat` | `chatQuery` | Daily | 12hr | ✅ Production |
| `/api/risk-metrics` | `portfolioAnalysis` | Daily | 6hr | ✅ Production |
| `/api/sec-edgar` | `secFiling` | Monthly | None | ✅ Production |

**All endpoints follow cache-before-quota pattern**: Cached responses do NOT count against quota.

---

## Request Flow

### Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                       User Request                           │
│                 (e.g., "Analyze my portfolio")              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   1. API Endpoint            │
          │   /api/risk-metrics          │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   2. Authenticate User       │
          │   getUserProfile()           │
          │   via SSR client + cookies   │
          └──────────────┬───────────────┘
                         │
                    ✅ Authenticated
                         │
                         ▼
          ┌──────────────────────────────┐
          │   3. Check Cache             │
          │   cacheKey = hash(data)      │
          └──────────────┬───────────────┘
                         │
                    Cache hit?
                    ┌────┴─────┐
                  YES          NO
                    │           │
                    ▼           ▼
         ┌─────────────┐  ┌──────────────────┐
         │ Return Cache│  │ 4. Check Quota   │
         │ NO QUOTA    │  │ Admin client     │
         │ USED ✅     │  │ usage_tracking   │
         └─────────────┘  └────────┬─────────┘
                                   │
                              Quota OK?
                          ┌────────┴────────┐
                        YES                 NO
                          │                 │
                          ▼                 ▼
              ┌──────────────────┐  ┌──────────────┐
              │ 5. Track Usage   │  │ Return 429   │
              │ Increment counter│  │ Quota Error  │
              └────────┬─────────┘  └──────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ 6. Process       │
              │ Calculate metrics│
              │ Call AI, etc.    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ 7. Cache Result  │
              │ For future reqs  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ 8. Return Result │
              │ to User          │
              └──────────────────┘
```

---

## Database Schema

### Core Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### usage_tracking
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

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user per period
  UNIQUE(user_id, period_start, period_end)
);

-- Index for period queries
CREATE INDEX idx_usage_tracking_period
ON usage_tracking(user_id, period_start, period_end);
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage records
CREATE POLICY "Users can create own usage"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage records
CREATE POLICY "Users can update own usage"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role has full access (bypasses RLS anyway)
CREATE POLICY "Service role full access"
  ON usage_tracking FOR ALL
  USING (true);
```

---

## Security Model

### Authentication Flow

```typescript
// lib/auth/session.ts
export async function getUserProfile() {
  const supabase = await createClient(); // SSR client

  // Get session from cookies
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return profile;
}
```

### Security Layers

1. **Authentication**: All endpoints require valid session
2. **RLS**: User-facing queries filtered by auth.uid()
3. **Quota enforcement**: Prevents abuse via usage limits
4. **Rate limiting**: (TODO) Per-IP limits
5. **Input validation**: Sanitize all user input

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Quota bypass** | Admin client tracks usage reliably |
| **Data access** | RLS prevents unauthorized access |
| **Session hijacking** | Secure cookies, HTTPS only |
| **Cache poisoning** | Hash-based cache keys |
| **Abuse** | Tier-based rate limits |

---

## Caching Strategy

### Cache Before Quota

**Critical Pattern**: Always check cache BEFORE tracking quota

```typescript
// ❌ WRONG
checkAndTrackUsage();  // Increments quota
checkCache();          // Then checks cache

// ✅ CORRECT
checkCache();          // Check cache first
if (cached) return;    // Return if hit (NO quota used)
checkAndTrackUsage();  // Only increment on miss
```

### Cache TTLs

| Resource | TTL | Reason |
|----------|-----|--------|
| AI Chat | 12 hours | Conversations change slowly |
| Risk Metrics | 6 hours | Portfolio updates throughout day |
| SEC Filings | None | Regulatory data must be fresh |
| User Profile | Session | Changes infrequently |

### Cache Key Generation

```typescript
function generateCacheKey(data: any): string {
  const cacheableContent = {
    // Include only deterministic data
    message: data.message?.toLowerCase().trim(),
    portfolioId: data.portfolioId,
    // Exclude: timestamps, user IDs, etc.
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(cacheableContent))
    .digest('hex');
}
```

---

## API Reference

### User-Facing APIs (RLS Protected)

#### GET /api/user/usage

Returns current usage statistics for authenticated user.

**Client**: SSR (RLS protected)

**Response**:
```json
{
  "success": true,
  "stats": {
    "tier": "free",
    "usage": {
      "daily": {
        "chatQueries": {
          "used": 3,
          "limit": 10,
          "remaining": 7
        },
        "portfolioAnalysis": {
          "used": 0,
          "limit": 1,
          "remaining": 1
        }
      },
      "monthly": {
        "secFilings": {
          "used": 2,
          "limit": 3,
          "remaining": 1
        }
      },
      "periodStart": {
        "daily": "2025-01-25T00:00:00.000Z",
        "monthly": "2025-01-01T00:00:00.000Z"
      },
      "periodEnd": {
        "daily": "2025-01-25T23:59:59.999Z",
        "monthly": "2025-01-31T23:59:59.999Z"
      }
    },
    "percentages": {
      "chatQueries": 30,
      "portfolioAnalysis": 0,
      "secFilings": 67
    },
    "warnings": {
      "chatQueries": false,
      "portfolioAnalysis": false,
      "secFilings": false
    }
  }
}
```

#### GET /api/user/quota

Returns quota information for authenticated user.

**Client**: SSR (RLS protected)

**Response**:
```json
{
  "userId": "abc-123",
  "tier": "free",
  "limits": {
    "chatQueriesPerDay": 10,
    "portfolioAnalysisPerDay": 1,
    "secFilingsPerMonth": 3
  },
  "quotas": {
    "chatQueries": {
      "used": 3,
      "limit": 10,
      "remaining": 7
    }
  },
  "resetAt": {
    "daily": "2025-01-26T00:00:00.000Z",
    "monthly": "2025-02-01T00:00:00.000Z"
  }
}
```

### Quota-Tracked APIs

#### POST /api/ai/chat

**Action**: `chatQuery` (daily)
**Cache**: 12 hours
**Client**: Admin (for quota)

**Request**:
```json
{
  "message": "What is portfolio diversification?",
  "portfolioId": "optional-portfolio-id"
}
```

**Response**:
```json
{
  "text": "Portfolio diversification is...",
  "confidence": 0.95,
  "model": "gemini-flash",
  "sources": ["..."],
  "cached": false
}
```

**Errors**:
```json
{
  "error": "Quota exceeded",
  "reason": "Daily chat query limit reached (10/day)",
  "upgradeUrl": "/pricing"
}
```

#### POST /api/risk-metrics

**Action**: `portfolioAnalysis` (daily)
**Cache**: 6 hours
**Client**: Admin (for quota)

**Request**:
```json
{
  "portfolioReturns": [0.05, 0.03, -0.02, 0.04],
  "marketReturns": [0.04, 0.02, -0.01, 0.03],
  "riskFreeRate": 0.045
}
```

**Response**:
```json
{
  "sharpe": 1.23,
  "sortino": 1.45,
  "alpha": 0.012,
  "beta": 0.95,
  "calmar": 2.1,
  "stdDev": 0.023,
  "maxDrawdown": -0.15,
  "currentDrawdown": -0.05,
  "rSquared": 0.87,
  "cached": false
}
```

#### GET /api/sec-edgar

**Action**: `secFiling` (monthly)
**Cache**: None
**Client**: Admin (for quota)

**Request**: `?symbol=AAPL` or `?cik=0000320193`

**Response**:
```json
{
  "cik": "0000320193",
  "entityName": "Apple Inc.",
  "filings": [
    {
      "form": "10-K",
      "filingDate": "2024-11-01",
      "accessionNumber": "0000320193-24-000123",
      "fileNumber": "001-36743",
      "description": "Annual Report"
    }
  ]
}
```

---

## Endpoint Implementation Details

### AI Chat Endpoint

**Route**: `/api/ai/chat` (POST)
**Action**: `chatQuery` (daily quota)
**Cache TTL**: 12 hours

**Implementation Flow**:
1. Authenticate user via `getUserProfile()`
2. Generate cache key from message + portfolioId
3. Check cache (12hr TTL)
   - **Cache HIT**: Return immediately (no quota used)
   - **Cache MISS**: Continue to quota check
4. Check and track quota via `checkAndTrackUsage()`
   - **Denied**: Return 429 with reason
   - **Allowed**: Increment counter and continue
5. Process AI request via Gemini API
6. Cache result for 12 hours
7. Return response to user

**Why 12-hour cache?**: Conversations and portfolio questions don't change rapidly.

---

### Portfolio Analysis Endpoint

**Route**: `/api/risk-metrics` (POST)
**Action**: `portfolioAnalysis` (daily quota)
**Cache TTL**: 6 hours

**Implementation Flow**:
1. Authenticate user via `getUserProfile()`
2. Validate input (portfolioReturns, marketReturns, riskFreeRate)
3. Generate cache key from data hash (SHA-256)
4. Check cache (6hr TTL)
   - **Cache HIT**: Return immediately (no quota used)
   - **Cache MISS**: Continue to quota check
5. Check and track quota via `checkAndTrackUsage()`
   - **Denied**: Return 429 with reason
   - **Allowed**: Increment counter and continue
6. Calculate risk metrics (Sharpe, Sortino, Alpha, Beta, Calmar)
7. Cache result for 6 hours
8. Return response to user

**Cache Key Generation**:
```typescript
const cacheKey = crypto
  .createHash('sha256')
  .update(JSON.stringify({
    portfolioReturns: returns.slice(0, 100),  // Limit data size
    marketReturns: market.slice(0, 100)
  }))
  .digest('hex');
```

**Why 6-hour cache?**: Portfolio values update throughout the trading day, but risk metrics based on historical returns don't change that frequently.

---

### SEC Filings Endpoint

**Route**: `/api/sec-edgar` (GET)
**Action**: `secFiling` (monthly quota)
**Cache**: None (always fresh)

**Implementation Flow**:
1. Authenticate user via `getUserProfile()`
2. Check and track quota via `checkAndTrackUsage()`
   - **Denied**: Return 429 with reason
   - **Allowed**: Increment counter and continue
3. Validate CIK or resolve from symbol
4. Fetch filings from SEC EDGAR API
5. Return filings to user

**Why no cache?**:
- SEC filings are regulatory data that changes frequently
- External SEC API has its own caching mechanisms
- Users expect the most up-to-date filings data
- Monthly quota is generous enough to not require caching

---

## Testing

### Unit Tests

```bash
# Test tier configuration
curl http://localhost:3000/api/test-tiers?test=config

# Test quota checking
curl http://localhost:3000/api/test-tiers?test=quota&userId=test&tier=free

# Test usage tracking
curl -X POST http://localhost:3000/api/test-tiers \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "tier": "free",
    "action": "chatQuery",
    "count": 15
  }'
```

### Integration Tests

```bash
# 1. Start server
npm run dev

# 2. Test AI Chat (daily quota, 12hr cache)
# First request - should use quota
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"message": "What is diversification?"}'

# Second request (same message) - should use cache (NO quota)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"message": "What is diversification?"}'

# Third request (different message) - should use quota
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"message": "Explain risk metrics"}'

# 3. Test Portfolio Analysis (daily quota, 6hr cache)
curl -X POST http://localhost:3000/api/risk-metrics \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "portfolioReturns": [0.05, 0.03, -0.02, 0.04],
    "marketReturns": [0.04, 0.02, -0.01, 0.03],
    "riskFreeRate": 0.045
  }'

# Repeat same data - should use cache (NO quota)
curl -X POST http://localhost:3000/api/risk-metrics \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "portfolioReturns": [0.05, 0.03, -0.02, 0.04],
    "marketReturns": [0.04, 0.02, -0.01, 0.03],
    "riskFreeRate": 0.045
  }'

# 4. Test SEC Filings (monthly quota, no cache)
curl "http://localhost:3000/api/sec-edgar?symbol=AAPL" \
  -H "Cookie: your-auth-cookie"

# Each request uses monthly quota (no cache)

# 5. Check usage dashboard
open http://localhost:3000/usage
```

### Verify Cache Behavior

Check console logs for cache indicators:

```bash
# Cache HIT (no quota used):
# ♻️ Returning cached chat response (age: 123s) - NO QUOTA USED
# ♻️ Returning cached risk metrics (age: 456s) - NO QUOTA USED

# Cache MISS (quota used):
# 💬 Processing AI chat query (user: abc-123, tier: free)
# 📊 Risk metrics calculated (user: abc-123, tier: free)
# 📄 Fetching SEC filings for CIK: 0000320193 (user: abc-123, tier: free)
```

---

## Future Improvements

### Recommended Enhancements

1. **Usage Alerts**
   - Email notifications when users approach 80% of quota
   - In-app warnings before limits are reached
   - Slack/Discord webhooks for admin monitoring

2. **Admin Dashboard**
   - Monitor usage across all users
   - Identify abuse patterns and anomalies
   - Track cache hit rates and efficiency metrics
   - View quota reset schedules
   - Bulk quota adjustments

3. **Analytics & Insights**
   - Most popular AI queries
   - Cache efficiency metrics (hit rate, savings)
   - Peak usage times and patterns
   - Tier conversion funnel
   - Cost analysis per tier

4. **Rate Limiting**
   - Per-IP rate limits (prevent abuse)
   - Per-user rate limits (prevent rapid-fire requests)
   - DDoS protection with services like Cloudflare
   - Exponential backoff for repeated failures

5. **Enhanced Caching**
   - Redis/Upstash for distributed caching
   - Cache warming for common queries
   - Smarter cache invalidation strategies
   - CDN integration for static content

6. **Quota Management**
   - Quota rollover options (configurable per tier)
   - Temporary quota boosts for special events
   - Quota sharing within teams/organizations
   - Usage credits system

---

## Monitoring

### Key Metrics

```sql
-- Daily active users
SELECT DATE(period_start), COUNT(DISTINCT user_id)
FROM usage_tracking
WHERE period_start >= NOW() - INTERVAL '30 days'
GROUP BY DATE(period_start);

-- Average usage by tier
SELECT
  tier,
  AVG(chat_queries) as avg_chat,
  AVG(portfolio_analysis) as avg_analysis,
  AVG(sec_filings) as avg_filings
FROM usage_tracking
WHERE period_start >= NOW() - INTERVAL '7 days'
GROUP BY tier;

-- Users approaching limits (80%+)
SELECT u.user_id, u.tier, u.chat_queries, c.chatQueriesPerDay
FROM usage_tracking u
JOIN tier_config c ON c.tier = u.tier
WHERE u.period_start >= CURRENT_DATE
  AND u.chat_queries >= c.chatQueriesPerDay * 0.8;

-- Cache hit rate (from application logs)
-- Look for ratio of cache hits vs total requests
```

---

## Summary

### Key Design Decisions

1. **Two clients, two purposes**
   - SSR client: User-facing, RLS protected
   - Admin client: System operations, bypass RLS

2. **Cache before quota**
   - Cached responses don't count
   - Better UX, lower costs

3. **Lazy period resets**
   - No cron jobs needed
   - Automatic via database queries

4. **Database-backed**
   - No in-memory state
   - Survives restarts
   - Audit trail

5. **Security layered**
   - Authentication required
   - RLS for user data
   - Admin client for reliability

### File Organization

```
lib/
├── auth/
│   └── session.ts              # User authentication
├── supabase/
│   ├── admin.ts                # Admin client (bypass RLS)
│   ├── server.ts               # SSR client (RLS protected)
│   ├── db.ts                   # DB helpers (SSR client)
│   └── database.types.ts       # TypeScript types
└── tiers/
    ├── config.ts               # Tier definitions
    ├── usage-tracker.ts        # Core quota logic (admin)
    └── index.ts                # Public exports

app/api/
├── ai/chat/route.ts            # Chat endpoint (daily quota)
├── risk-metrics/route.ts       # Analysis endpoint (daily quota)
├── sec-edgar/route.ts          # Filings endpoint (monthly quota)
├── user/usage/route.ts         # Usage dashboard (RLS)
└── user/quota/route.ts         # Quota check (RLS)
```

---

## Quick Reference

### When to use SSR vs Admin client

**Use SSR Client when**:
- Displaying user's own data
- User-initiated queries
- Dashboard/UI operations
- Should respect user permissions

**Use Admin Client when**:
- Tracking usage
- System operations
- Background jobs
- Need reliable write access
- Bypassing RLS is necessary

### Common Patterns

**Check quota**:
```typescript
const quota = await checkQuota(userId, 'chatQuery', tier);
if (!quota.allowed) {
  return res.status(429).json({ error: quota.reason });
}
```

**Track usage**:
```typescript
await trackUsage(userId, 'portfolioAnalysis', tier);
```

**Atomic check + track**:
```typescript
const result = await checkAndTrackUsage(userId, 'secFiling', tier);
if (!result.allowed) {
  return res.status(429).json({ error: result.reason });
}
```

---

## External API Integration

### API Providers

The application integrates with multiple external APIs for market data, financial information, and news.

#### Stock Quote Providers

**Primary Provider: Alpha Vantage**
- Free Tier: 25 requests/day, 5 requests/minute
- Real-time US stock quotes
- Canadian stocks (TSX) support
- Used by default in `/api/quote/route.ts`

**Fallback Provider: Financial Modeling Prep (FMP)**
- Free Tier: 250 requests/day
- Batch support for multiple symbols
- International stocks (TSX, LSE, etc.)
- Faster response times than Alpha Vantage

**Provider Selection Strategy:**
```typescript
// lib/services/stock-data.service.ts
// 1. Check cache (5min TTL)
// 2. Try Alpha Vantage (primary)
// 3. Fallback to FMP on failure
// 4. Return stale cache as last resort
```

**Configuration:**
```bash
# .env.local
ALPHAVANTAGE_API_KEY=your_key
FMP_API_KEY=your_key
STOCK_API_PROVIDER=alphavantage  # or 'fmp'
```

#### Other Data Providers

| Provider | Purpose | Files |
|----------|---------|-------|
| **Yahoo Finance** | Fundamentals, financial statements | `lib/dao/yahoo-finance.dao.ts` |
| **Finnhub** | News feeds | `lib/dao/finnhub.dao.ts` |
| **Brave Search** | Alternative news source | `lib/dao/brave-search.dao.ts` |
| **SEC EDGAR** | SEC filings lookup | `lib/dao/sec-edgar.dao.ts` |

---

## Authentication System

### Overview

Authentication is handled by **Supabase** with session-based auth using `proxy.ts` (not middleware.ts, following Supabase's Next.js 16+ recommendation).

### Authentication Architecture

```
User Request
    ↓
proxy.ts (Session validation via getClaims())
    ↓
Route Protection (redirect if unauthenticated)
    ↓
Server Components / API Routes
    ↓
Supabase Client (SSR or Admin)
    ↓
Database (RLS-protected)
```

### Key Components

**Proxy Configuration:** `proxy.ts`
- Session refresh on every request
- JWT validation using `getClaims()` (performant, cached)
- Route protection for protected pages
- Automatic redirects for auth pages

**Session Helpers:** `lib/auth/session.ts`
- `getUser()` - Get current user or null
- `requireUser()` - Require auth, redirect if not authenticated
- `getUserProfile()` - Get user profile with tier
- `requireTier(tier)` - Require specific tier, redirect to pricing

**Protected Routes:**
- `/dashboard` (and all sub-routes)
- `/thesis`, `/checklist`, `/fundamentals`, `/risk`, `/settings`

### Why proxy.ts (Not middleware.ts)

**Supabase Recommendation for Next.js 16+:**
- `proxy.ts` runs on Node.js runtime with full server capabilities
- `middleware.ts` runs on Edge runtime with database connection limitations
- Official Supabase docs use `proxy.ts` pattern for SSR authentication

### Authentication Methods

**getClaims() vs getUser():**
- `getClaims()`: Validates JWT signatures against cached public keys (JWKS endpoint)
- `getUser()`: Makes network requests to Supabase Auth server (slower)
- **Recommended:** Use `getClaims()` for better performance

### Database Triggers

**handle_new_user()** - Automatically creates profile when user signs up
- Extracts name from user metadata
- Sets default tier to 'free'
- Prevents duplicate profiles

---

## Service Layer Architecture

### Layered Architecture Pattern

The application follows a Spring-style layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│     Client Layer (React)                │
│  - Components, Hooks                    │
└───────────────┬─────────────────────────┘
                │ HTTP requests
                ↓
┌─────────────────────────────────────────┐
│     Controller Layer (API Routes)       │
│  - app/api/quote/route.ts               │
│  - app/api/fundamentals/route.ts        │
└───────────────┬─────────────────────────┘
                │ Service calls
                ↓
┌─────────────────────────────────────────┐
│     Service Layer                       │
│  - StockDataService                     │
│  - FinancialDataService                 │
│  - NewsService                          │
└───────────────┬─────────────────────────┘
                │ DAO calls
                ↓
┌─────────────────────────────────────────┐
│     DAO Layer                           │
│  - AlphaVantageDAO, FMPDAO              │
│  - YahooFinanceDAO, FinnhubDAO          │
└───────────────┬─────────────────────────┘
                │ HTTP requests
                ↓
         External APIs
```

### Layer Responsibilities

**DAO Layer** (`lib/dao/`)
- Make HTTP requests to external APIs
- Handle timeouts, retries, errors
- Parse raw API responses
- Return typed data models
- **NO business logic** - pure data access

**Service Layer** (`lib/services/`)
- Coordinate between multiple DAOs
- Implement business logic (fallbacks, retries, aggregation)
- Cache management
- Data transformation
- Error handling and logging

**Controller Layer** (`app/api/`)
- Request/response handling
- Input validation
- Call service layer methods
- Format responses for client

**Client Layer** (`components/`, `lib/hooks/`)
- React components
- Custom hooks for data fetching
- UI state management

### File Organization

```
lib/
├── dao/                    # Data Access Objects
│   ├── base.dao.ts        # Base class with common HTTP logic
│   ├── alpha-vantage.dao.ts
│   ├── fmp.dao.ts
│   ├── yahoo-finance.dao.ts
│   ├── finnhub.dao.ts
│   ├── brave-search.dao.ts
│   └── sec-edgar.dao.ts
│
├── services/              # Service Layer
│   ├── stock-data.service.ts
│   ├── financial-data.service.ts
│   ├── news.service.ts
│   └── market-data.service.ts
```

### Example: Stock Data Service

```typescript
// lib/services/stock-data.service.ts
export class StockDataService {
  private alphaVantageDAO: AlphaVantageDAO;
  private fmpDAO: FinancialModelingPrepDAO;

  async getStockQuote(symbol: string): Promise<StockQuote> {
    // 1. Try cache (5min TTL)
    const cached = loadFromCache<StockQuote>(`quote-${symbol}`);
    if (cached && getCacheAge(`quote-${symbol}`) < 5 * 60 * 1000) {
      return { ...cached, source: 'cache' };
    }

    // 2. Try Alpha Vantage (primary)
    try {
      const quote = await this.alphaVantageDAO.getQuote(symbol);
      saveToCache(`quote-${symbol}`, quote);
      return quote;
    } catch (error) {
      // Special handling for rate limits
      if (error.message.includes('RATE_LIMIT') && cached) {
        return { ...cached, source: 'cache' };
      }
    }

    // 3. Fallback to FMP
    try {
      const quote = await this.fmpDAO.getQuote(symbol);
      saveToCache(`quote-${symbol}`, quote);
      return quote;
    } catch (error) {
      // Return stale cache or null
      if (cached) return { ...cached, source: 'cache' };
      return { symbol, price: null, ... };
    }
  }
}
```

---

## Stock Price Retrieval System

### Request Flow

```
User Action (page load, manual refresh)
    ↓
lib/utils/priceUpdater.ts: fetchStockPrice()
    ↓
HTTP GET /api/quote?symbols=AAPL,MSFT
    ↓
app/api/quote/route.ts
    ↓
StockDataService.getBatchQuotes()
    ↓
For each symbol: 4-level fallback
    ├─ 1. Cache (5min TTL) → Return if fresh
    ├─ 2. Alpha Vantage → Try primary provider
    ├─ 3. FMP → Try fallback provider
    └─ 4. Stale Cache or Null → Last resort
    ↓
Return quotes to client
```

### 4-Level Fallback Strategy

| Level | Source | Latency | Freshness | When Used |
|-------|--------|---------|-----------|-----------|
| 1 | **Cache** | ~1ms | 0-5 min | Always tried first |
| 2 | **Alpha Vantage** | 200-2000ms | Real-time | Cache miss or expired |
| 3 | **FMP** | 200-2000ms | Real-time | Alpha Vantage failed |
| 4 | **Stale Cache** | ~1ms | Any age | All providers failed |
| 5 | **Null/N/A** | 0ms | N/A | No data available |

### Caching Strategy

**Cache Configuration:**
- **Location:** `lib/serverCache.ts` (in-memory, dev only)
- **TTL:** 5 minutes for fresh cache
- **Key Format:** `quote-{SYMBOL}` (e.g., `quote-AAPL`)
- **Stale Cache:** Used when all providers fail, regardless of age

**Cache Operations:**
```typescript
loadFromCache<StockQuote>(cacheKey)  // Returns value or null
saveToCache(cacheKey, quote)         // Save with timestamp
getCacheAge(cacheKey)                // Returns age in ms or Infinity
```

**Production Recommendation:**
- Replace in-memory cache with **Redis**
- Implement automatic TTL expiration
- Enable distributed caching for multi-instance deployments

### Error Handling

**Error Classification:**
- **Network Timeout:** 5-second timeout per request
- **HTTP Error:** Non-200 status codes
- **Rate Limit:** Alpha Vantage 25 req/day, 5 req/min
- **API Error:** Provider-specific errors
- **No Data:** Symbol not found or invalid

**Price Treated as N/A When:**
1. All providers failed + no cache exists
2. API returns error response
3. Price value is invalid (null, ≤0, non-numeric)
4. HTTP request failed
5. Network exception

### Performance Characteristics

**Latency:**
- Cache hit (fresh): 1-5ms
- Alpha Vantage success: 200-2000ms
- Alpha Vantage fail → FMP success: 5000ms + 200-2000ms
- Worst case (both fail): ~10 seconds

**Batch Requests:**
- Parallel execution via Promise.all
- Total latency = slowest individual request
- Independent error handling per symbol

### Production Considerations

**Critical Issues:**
- In-memory cache not suitable for production
- Free tier rate limits insufficient for scale (1000+ users)
- Need monitoring and alerting for provider health
- Consider circuit breaker pattern for failing providers

**Recommended Improvements:**
- Migrate to Redis cache with TTL expiration
- Upgrade to paid API tiers (10,000+ requests/day)
- Add Prometheus metrics + Grafana monitoring
- Implement circuit breaker (skip failing providers temporarily)

---

**Last Updated**: 2025-11-25
**Version**: 2.0
**Status**: Production Ready ✅
