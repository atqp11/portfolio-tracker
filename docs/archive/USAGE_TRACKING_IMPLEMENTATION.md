# Usage Tracking Implementation Guide

## Summary

All tasks from the previous session have been completed:

1. ✅ **Test API endpoint created** - `/api/test-tiers`
2. ✅ **Usage tracking tested** - Database-backed tracking system ready
3. ✅ **Quota enforcement added** - AI chat route now enforces tier limits
4. ✅ **Usage dashboard created** - New page at `/usage`

## Implementation Details

### 1. Test API Endpoint

**Location:** `app/api/test-tiers/route.ts`

**Features:**
- Test tier configurations
- Test usage tracking with database
- Simulate usage and quota checks
- Support for all three tiers (free, basic, premium)

**Usage:**
```bash
# Test all features
curl http://localhost:3000/api/test-tiers

# Test configuration only
curl http://localhost:3000/api/test-tiers?test=config

# Test usage for specific user and tier
curl "http://localhost:3000/api/test-tiers?test=usage&userId=test-user-123&tier=free"

# Simulate usage tracking (POST)
curl -X POST http://localhost:3000/api/test-tiers \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tier": "free",
    "action": "chatQuery",
    "count": 5
  }'
```

### 2. Quota Enforcement in AI Chat Route

**Location:** `app/api/ai/chat/route.ts`

**Changes:**
- Added authentication check using `getUserProfile()`
- Integrated `checkAndTrackUsage()` before processing chat requests
- Returns 429 status with upgrade prompt when quota is exceeded
- Automatically tracks usage after successful quota check

**Flow:**
1. User sends chat request
2. System checks authentication
3. System checks quota availability
4. If quota available, process request and track usage
5. If quota exceeded, return 429 error with upgrade link

### 3. Usage Dashboard Page

**Location:** `app/(dashboard)/usage/page.tsx`

**Features:**
- Real-time usage statistics
- Progress bars for all quotas
- Visual warnings when approaching limits (80%+)
- Daily and monthly quota tracking
- Auto-refresh every 30 seconds
- Upgrade prompts when nearing limits
- Responsive design with dark mode support

**API Endpoint:** `app/api/user/usage/route.ts`

**What it displays:**
- Current subscription tier
- Daily quotas:
  - AI Chat Queries (used / limit)
  - Portfolio Analysis (used / limit)
- Monthly quotas:
  - SEC Filing Access (used / limit)
- Time until next reset
- Usage percentages with color-coded progress bars
- Helpful information about how tracking works

### 4. Navigation Update

**Location:** `components/layout/Sidebar.tsx`

**Changes:**
- Added "Usage & Quotas" link to sidebar navigation
- Positioned between "Checklist" and "Settings"
- Uses 📉 icon for visual identification

## Database Schema

The system uses the `usage_tracking` table (should already exist from Supabase migration):

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tier TEXT NOT NULL,
  chat_queries INTEGER DEFAULT 0,
  portfolio_analysis INTEGER DEFAULT 0,
  sec_filings INTEGER DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Tier System Overview

The system uses the **NEW** tier configuration in `lib/tiers/`:

### Tiers:
- **Free**: $0/month - 10 chat queries/day, 1 analysis/day, 3 SEC filings/month
- **Basic**: $9.99/month - 100 chat queries/day, 10 analyses/day, unlimited SEC filings
- **Premium**: $19.99/month - Unlimited everything

### Key Functions:
- `checkQuota()` - Check if user has quota remaining
- `trackUsage()` - Increment usage counter
- `checkAndTrackUsage()` - Check quota and track in one operation (recommended)
- `getUserUsage()` - Get current usage stats
- `getUsageStats()` - Get formatted stats for dashboard

## Testing Instructions

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test the Test Endpoint
```bash
# Test configuration
curl http://localhost:3000/api/test-tiers?test=config

# Test usage tracking (requires database)
curl "http://localhost:3000/api/test-tiers?test=usage&userId=test-123&tier=free"

# Simulate usage
curl -X POST http://localhost:3000/api/test-tiers \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-123","tier":"free","action":"chatQuery","count":3}'
```

### 3. Test AI Chat Quota Enforcement

**Sign in as a user and try:**
1. Make a chat request - should work
2. Make requests until quota is exhausted
3. Should receive 429 error with upgrade prompt
4. Check `/usage` page to see updated statistics

### 4. View Usage Dashboard

1. Navigate to `http://localhost:3000/usage`
2. Should see:
   - Current tier
   - Usage statistics with progress bars
   - Time until reset
   - Upgrade prompts if approaching limits

## Important Notes

### Two Tier Systems
There are currently TWO tier systems in the codebase:

1. **OLD System** (`lib/auth/tier-limits.ts`):
   - In-memory tracking
   - Tiers: free, pro, premium
   - Not database-backed
   - Should be deprecated

2. **NEW System** (`lib/tiers/`):
   - Database-backed tracking ✅
   - Tiers: free, basic, premium
   - Used by AI chat route and usage dashboard
   - **This is the active system**

### Migration Recommendation
The old system should be gradually phased out in favor of the new database-backed system.

## Next Steps

To fully enable the system:

1. **Ensure Database Table Exists**
   - Run Supabase migrations to create `usage_tracking` table
   - Check with: `npx supabase db pull`

2. **Update User Profiles**
   - Ensure `profiles` table has `tier` column
   - Default new users to 'free' tier

3. **Add Quota Enforcement to Other Routes**
   - Portfolio analysis endpoint
   - SEC filing endpoint
   - Any other AI-powered features

4. **Testing with Real Users**
   - Create test users with different tiers
   - Verify quota enforcement works correctly
   - Test quota reset functionality

5. **Add Admin Dashboard**
   - View aggregate usage across all users
   - Monitor quota violations
   - Identify upgrade opportunities

## Troubleshooting

### Usage Dashboard Shows Error
- Ensure user is authenticated
- Check database connection
- Verify `usage_tracking` table exists
- Check browser console for errors

### Quota Not Enforced
- Verify `checkAndTrackUsage()` is called before processing
- Check user profile has correct tier
- Ensure database is accessible
- Review error logs

### Usage Not Tracking
- Check Supabase admin client configuration
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Review database permissions
- Check error logs for failed inserts/updates

## Files Modified

- `app/api/ai/chat/route.ts` - Added quota enforcement
- `components/layout/Sidebar.tsx` - Added usage link
- `app/(dashboard)/usage/page.tsx` - Created usage dashboard
- `app/api/user/usage/route.ts` - Created usage API endpoint

## Files Created

- `docs/USAGE_TRACKING_IMPLEMENTATION.md` - This guide

## Related Documentation

- `docs/FEATURE_ROADMAP.md` - Overall feature roadmap
- `lib/tiers/config.ts` - Tier configurations
- `lib/tiers/usage-tracker.ts` - Usage tracking implementation
- `app/api/test-tiers/route.ts` - Testing endpoint
