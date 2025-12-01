# User Module

MVC module for user-related operations including profile management and usage statistics.

## Architecture

```
src/backend/modules/user/
├── dto/
│   └── usage.dto.ts          # Data Transfer Objects (Zod schemas)
├── service/
│   ├── user.service.ts       # User profile business logic
│   └── usage.service.ts      # Usage statistics calculations
├── __tests__/
│   ├── usage.service.test.ts          # Unit tests (10 tests)
│   └── user-usage.integration.test.ts # Integration tests (9 tests)
└── user.controller.ts        # HTTP request handlers
```

## Usage Statistics Service

### Purpose
Calculates user quota usage across different subscription tiers with:
- Daily metrics (chat queries, portfolio analysis)
- Monthly metrics (SEC filings)
- Percentage calculations
- Warning thresholds (80%+ usage)
- Period boundary calculations

### Service Layer: `UsageService`

**Responsibilities:**
- Fetch raw usage data from repository
- Apply tier-specific limits
- Calculate remaining quotas
- Compute usage percentages
- Generate warning flags

**Key Methods:**

```typescript
async getUserUsageStats(userId: string, tier: TierName): Promise<UsageStats>
```
Returns complete usage statistics including:
- Used/limit/remaining for each metric
- Percentage calculations (0-100, capped)
- Warning flags (true when ≥80%)
- Period boundaries (daily/monthly)

**Private Methods:**
- `buildUsageMetric()` - Constructs usage metric with remaining calculation
- `calculatePercentage()` - Computes percentage, handles Infinity limits
- `calculatePeriods()` - Generates UTC period boundaries

### Controller Layer: `UserController`

**Responsibilities:**
- HTTP request/response handling
- Authentication verification
- Error formatting
- Delegation to service layer

**Endpoints:**

**GET /api/user/usage**
Returns current usage statistics for authenticated user.

Request: None (uses session)

Response:
```typescript
{
  success: true,
  stats: {
    tier: "free",
    usage: {
      daily: {
        chatQueries: { used: 5, limit: 10, remaining: 5 },
        portfolioAnalysis: { used: 2, limit: 3, remaining: 1 }
      },
      monthly: {
        secFilings: { used: 3, limit: 5, remaining: 2 }
      },
      periodStart: { daily: Date, monthly: Date },
      periodEnd: { daily: Date, monthly: Date }
    },
    percentages: {
      chatQueries: 50,
      portfolioAnalysis: 66.67,
      secFilings: 60
    },
    warnings: {
      chatQueries: false,
      portfolioAnalysis: false,
      secFilings: false
    }
  }
}
```

Error Response (401):
```typescript
{
  error: "Authentication required. Please sign in to view your usage statistics."
}
```

Error Response (500):
```typescript
{
  success: false,
  error: "Error message",
  details: "Stack trace (if available)"
}
```

## Usage Patterns

### Service Layer (Reusable)

```typescript
import { usageService } from '@backend/modules/user/service/usage.service';

// Get complete usage stats
const stats = await usageService.getUserUsageStats('user-123', 'free');

console.log(`Chat queries: ${stats.usage.daily.chatQueries.used}/${stats.usage.daily.chatQueries.limit}`);
console.log(`Usage: ${stats.percentages.chatQueries}%`);

if (stats.warnings.chatQueries) {
  console.log('Warning: Approaching quota limit!');
}
```

### Controller Layer (HTTP)

```typescript
import { userController } from '@backend/modules/user/user.controller';

// In route handler
export async function GET(req: NextRequest) {
  return userController.getUsage(req);
}
```

## Data Flow

```
HTTP Request
    ↓
Route (app/api/user/usage/route.ts)
    ↓
Controller (user.controller.ts)
    ├─→ Authenticate user (getUserProfile)
    ↓
Service (usage.service.ts)
    ├─→ Fetch raw usage (getCurrentUserUsage)
    ├─→ Get tier config (getTierConfig)
    ├─→ Calculate metrics
    ├─→ Compute percentages
    └─→ Generate warnings
    ↓
Controller formats response
    ↓
HTTP Response (JSON)
```

## Tier Handling

### Free Tier
- Chat queries: 10/day
- Portfolio analysis: 3/day
- SEC filings: 5/month

### Premium Tier
- All metrics: Infinity
- Percentages always 0
- Warnings always false

### Calculations
- **Percentage**: `(used / limit) * 100`, capped at 100
- **Remaining**: `max(0, limit - used)`
- **Warning**: `percentage >= 80`
- **Infinity handling**: Returns 0% usage, no warnings

## Testing

### Unit Tests (10 tests)
- `usage.service.test.ts`
- Tests business logic in isolation
- Mocks repository and tier config
- Covers: zero usage, partial usage, quota exceeded, infinite limits, percentages, warnings, period boundaries

Run: `npm test -- src/backend/modules/user/__tests__/usage.service.test.ts`

### Integration Tests (9 tests)
- `user-usage.integration.test.ts`
- Tests full HTTP flow
- Mocks only external dependencies (auth, database)
- Covers: authentication, different tiers, warnings, errors, edge cases

Run: `npm test -- src/backend/modules/user/__tests__/user-usage.integration.test.ts`

### All Tests
Run: `npm test -- src/backend/modules/user/__tests__`

## Dependencies

### Internal
- `@lib/auth/session` - User authentication (`getUserProfile`)
- `@lib/tiers` - Tier configuration (`getTierConfig`, `TierName`)
- `@lib/supabase/db` - Usage data repository (`getCurrentUserUsage`)

### External
- `next/server` - HTTP handling
- `zod` - Schema validation

## Mobile Reusability

The service layer is framework-agnostic and can be reused in:
- React Native mobile app
- Electron desktop app
- CLI tools
- Background jobs

Just import `usageService` and call methods directly without HTTP layer.

## Notes

- All dates are in UTC
- Daily period: 00:00:00 to 23:59:59 UTC
- Monthly period: 1st to last day of month
- Percentages capped at 100 even if usage exceeds limit
- Remaining values never go negative (use `Math.max(0, ...)`)
- `Infinity` serializes to `null` in JSON responses
