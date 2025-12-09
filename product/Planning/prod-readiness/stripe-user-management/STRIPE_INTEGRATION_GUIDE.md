# Stripe Integration Guide

Complete guide for Stripe payment integration in Portfolio Tracker, including design decisions, workflows, pricing page implementation, setup, and testing.

**Table of Contents:**
- [Design & Architecture](#design--architecture)
- [User Journey & High-Level Flows](#user-journey--high-level-flows)
- [Pricing & Landing Page Implementation](#pricing--landing-page-implementation)
- [Architectural Choices & Rationale](#architectural-choices--rationale)
- [Quick Start](#quick-start)
- [Setup Guide](#setup-guide)
- [Testing Guide](#testing-guide)

---

## Design & Architecture

### Pricing Tiers

| Tier | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Free** | $0 | $0 | 1 portfolio, 10 stocks, 50 AI queries/day |
| **Basic** | $5.99 | $59.99 | 5 portfolios, 50 stocks/portfolio, 200 AI queries/day, Investment thesis |
| **Premium** | $15.99 | $159.99 | Unlimited portfolios/stocks, 1000 AI queries/day, Technical analysis, Monte Carlo |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Components                         │
│  (pricing-content-client.tsx, billing components)           │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ Calls Server Actions
                        │
┌──────────────────────▼──────────────────────────────────────┐
│                    Server Actions                            │
│  (app/(public)/pricing/actions.ts)                          │
│  (app/(protected)/billing/actions.ts)                        │
│  - Validates input with Zod                                 │
│  - Resolves price IDs server-side                           │
│  - Calls controllers (not services directly)                │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ Calls Controller
                        │
┌──────────────────────▼──────────────────────────────────────┐
│                    Controllers                               │
│  (src/backend/modules/stripe/stripe.controller.ts)          │
│  - Data methods: Return DTOs (for Server Actions)            │
│  - HTTP methods: Return NextResponse (for API Routes)       │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ Calls Service
                        │
┌──────────────────────▼──────────────────────────────────────┐
│                    Services                                 │
│  (src/backend/modules/stripe/stripe.service.ts)             │
│  - Business logic                                           │
│  - Stripe API calls                                         │
│  - Database updates                                         │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ External API
                        │
┌──────────────────────▼──────────────────────────────────────┐
│                    Stripe API                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Server Actions:**
- `app/(public)/pricing/actions.ts` - Checkout session creation
- `app/(protected)/billing/actions.ts` - Customer portal session creation

**Controllers:**
- `src/backend/modules/stripe/stripe.controller.ts` - Request/response layer

**Services:**
- `src/backend/modules/stripe/stripe.service.ts` - Business logic
- `src/lib/stripe/client.ts` - Stripe client wrapper

**API Routes:**
- `app/api/stripe/webhook/route.ts` - Webhook handler (required for external service)

**Utilities:**
- `src/lib/pricing/tiers.ts` - Pricing tier configuration and `resolvePriceId()`
- `src/lib/stripe/validation.ts` - Zod validation schemas

### Environment Variables

**Server-Side (Required):**
```bash
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
STRIPE_WEBHOOK_SECRET=whsec_test_xxx...
STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...
```

**Client-Side (Optional - Display Only):**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...
```

**Security Note:** Server always resolves price IDs using `resolvePriceId(tier, billingPeriod)` with server-only env vars. Client-provided price IDs are ignored for security.

---

## User Journey & High-Level Flows

### User Acquisition Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Acquisition Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   [Landing Page]                                                         │
│       │                                                                  │
│       ├─── Hero CTA: "Get Started Free" ───▶ [Sign Up Page]             │
│       │                                                                  │
│       ├─── Pricing Section ───▶ [Pricing Page]                          │
│       │                              │                                   │
│       │                              ├─── Free: "Get Started" ──▶ [Sign Up] │
│       │                              │                                   │
│       │                              ├─── Basic: "Start Trial" ──▶ [Checkout] │
│       │                              │                                   │
│       │                              └─── Premium: "Start Trial" ──▶ [Checkout] │
│       │                                                                  │
│       └─── Feature Sections ───▶ [Sign Up Page]                         │
│                                                                          │
│   [Sign Up Page]                                                         │
│       │                                                                  │
│       └─── OAuth (Google) ───▶ [Dashboard] (Free tier)                  │
│                                     │                                    │
│                                     └─── Upgrade CTA ───▶ [Pricing]     │
│                                                                          │
│   [Checkout (Stripe)]                                                    │
│       │                                                                  │
│       └─── Payment Success ───▶ [Dashboard] (Upgraded tier)             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1. Checkout Flow (New Subscription)

```
User clicks "Start 14-Day Free Trial"
    ↓
Client Component (pricing-content-client.tsx)
    - Validates user is authenticated
    - Gets tier and billingPeriod
    ↓
Server Action (createCheckoutSession)
    - Validates input with Zod (tier, billingPeriod, URLs)
    - Resolves priceId server-side: resolvePriceId(tier, billingPeriod)
    - Calls Controller
    ↓
Controller (createCheckoutSessionData)
    - Validates tier
    - Calls Service
    ↓
Service (createStripeCheckoutSession)
    - Creates/retrieves Stripe customer
    - Creates checkout session with:
      - Price ID (server-resolved)
      - Trial period (14 days)
      - Success/cancel URLs
      - User ID in metadata
    - Returns checkout URL
    ↓
User redirected to Stripe Checkout
    - Enters payment information
    - Confirms subscription
    ↓
Stripe processes payment
    - Creates subscription
    - Sends webhook events
    ↓
Webhook Handler (app/api/stripe/webhook/route.ts)
    - Verifies signature
    - Checks for duplicate events (idempotency)
    - Processes event:
      - checkout.session.completed
      - customer.subscription.created
      - invoice.payment_succeeded
    - Updates user tier in database
    - Logs transaction
    ↓
User redirected to /dashboard?upgraded=true
    - Tier updated to "basic" or "premium"
    - Access to paid features enabled
```

### 2. Upgrade Flow (Free → Paid)

Same as Checkout Flow. User starts on Free tier and upgrades to Basic or Premium.

### 3. Downgrade Flow (Premium → Basic or Paid → Free)

```
User clicks "Manage Subscription"
    ↓
Client Component calls Server Action (createPortalSession)
    ↓
Server Action → Controller → Service
    - Creates Stripe Customer Portal session
    - Returns portal URL
    ↓
User redirected to Stripe Customer Portal
    - Views subscription details
    - Changes plan or cancels
    ↓
Stripe processes change
    - Updates subscription
    - Sends webhook events
    ↓
Webhook Handler
    - customer.subscription.updated (plan change)
    - customer.subscription.deleted (cancellation)
    - Updates user tier in database
    - Logs transaction
    ↓
User tier updated
    - Premium → Basic: Features downgraded
    - Any paid → Free: All paid features removed
```

### 4. Cancel Flow (Subscription Cancellation)

```
User cancels subscription in Customer Portal
    ↓
Stripe sends webhook: customer.subscription.deleted
    ↓
Webhook Handler
    - Updates subscription_status to "canceled"
    - Updates tier to "free"
    - Clears stripe_subscription_id
    - Logs transaction
    ↓
User immediately downgraded to Free tier
    - Access to paid features removed
    - Can re-subscribe anytime
```

### 5. Payment Failure Flow

```
Payment fails (card declined, insufficient funds, etc.)
    ↓
Stripe sends webhook: invoice.payment_failed
    ↓
Webhook Handler
    - Updates subscription_status to "past_due"
    - Updates last_payment_status to "failed"
    - Stores error message
    - Logs transaction
    ↓
User retains access during grace period
    - Stripe retries payment automatically
    - User notified via email (Stripe)
    ↓
If payment succeeds on retry:
    - invoice.payment_succeeded webhook
    - subscription_status → "active"
    ↓
If payment fails after retries:
    - subscription.deleted webhook
    - User downgraded to Free tier
```

### 6. Post-Auth Checkout Flow

```
User (unauthenticated) clicks "Start Trial" on pricing page
    ↓
Client Component detects no authentication
    - Stores selected tier/billing in sessionStorage
    - Redirects to /auth/sign-up?redirect=checkout
    ↓
User completes authentication
    ↓
Auth callback checks for redirect=checkout
    - Redirects to /pricing?resume=checkout
    ↓
Pricing page detects resume=checkout
    - Retrieves saved plan from sessionStorage
    - Automatically initiates checkout
    ↓
Checkout flow continues as normal
```

---

## Pricing & Landing Page Implementation

### Pricing Tiers Configuration

**File:** `src/lib/pricing/tiers.ts`

```typescript
export interface PricingTier {
  id: 'free' | 'basic' | 'premium';
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  priceId: {
    monthly: string;
    annual: string;
  };
  features: string[];
  limitations: string[];
  cta: {
    text: string;
    variant: 'outline' | 'default' | 'premium';
  };
  popular?: boolean;
  trialDays?: number;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic portfolio tracking',
    price: {
      monthly: 0,
      annual: 0,
    },
    priceId: {
      monthly: '',
      annual: '',
    },
    features: [
      '1 portfolio',
      '10 stocks maximum',
      '50 AI queries per day',
      'Basic market data',
      'Daily checklist',
    ],
    limitations: [
      'No investment thesis',
      'No SEC filings',
      'Limited AI features',
    ],
    cta: {
      text: 'Get Started Free',
      variant: 'outline',
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'For active investors who want more insights',
    price: {
      monthly: 5.99,
      annual: 59.99, // ~2 months free
    },
    priceId: {
      // Client-side display only - server resolves actual priceId server-side
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL || '',
    },
    features: [
      '5 portfolios',
      '50 stocks per portfolio',
      '200 AI queries per day',
      'Investment thesis tracking',
      'Basic SEC filing summaries',
      'Email support',
    ],
    limitations: [
      'Limited AI analysis depth',
    ],
    cta: {
      text: 'Start 14-Day Free Trial',
      variant: 'default',
    },
    popular: true,
    trialDays: 14,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For serious investors who need every edge',
    price: {
      monthly: 15.99,
      annual: 159.99, // ~2 months free
    },
    priceId: {
      // Client-side display only - server resolves actual priceId server-side
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL || '',
    },
    features: [
      'Unlimited portfolios',
      'Unlimited stocks',
      '1000 AI queries per day',
      'Full investment thesis with AI validation',
      'Complete SEC filing analysis',
      'Priority email support',
      'Advanced risk metrics',
      'Custom alerts',
    ],
    limitations: [],
    cta: {
      text: 'Start 14-Day Free Trial',
      variant: 'premium',
    },
    trialDays: 14,
  },
];
```

### Pricing Page Structure

**File:** `app/(public)/pricing/page.tsx`

```tsx
import { Metadata } from 'next';
import PricingContent from './pricing-content-client';

export const metadata: Metadata = {
  title: 'Pricing - Portfolio Tracker',
  description: 'Choose the plan that fits your investment journey',
};

export default function PricingPage() {
  return <PricingContent />;
}
```

**File:** `app/(public)/pricing/pricing-content-client.tsx`

The pricing page client component handles:
- Monthly/Annual billing toggle
- Plan selection
- Authentication check
- Checkout initiation via Server Action
- Post-auth checkout resume

### Landing Page Integration

**Add Pricing Section to Landing Page:**

```tsx
// Add to LandingPage component

import { PRICING_TIERS } from '@/src/lib/pricing/tiers';
import { PricingCard } from '@/components/pricing/PricingCard';

// In the component:
<section id="pricing" className="py-20 bg-gray-900">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Start Free, Upgrade When Ready
      </h2>
      <p className="text-xl text-gray-400 max-w-2xl mx-auto">
        Begin with our free plan. Upgrade anytime to unlock advanced features.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {PRICING_TIERS.map((tier) => (
        <PricingCard
          key={tier.id}
          tier={tier}
          billingPeriod="monthly"
          onSelect={() => {
            // Navigate to pricing page for full experience
            window.location.href = `/pricing?tier=${tier.id}`;
          }}
        />
      ))}
    </div>

    <div className="text-center mt-12">
      <Link href="/pricing" className="text-indigo-400 hover:text-indigo-300">
        View full pricing details →
      </Link>
    </div>
  </div>
</section>
```

**Update Hero CTA:**

```tsx
// Hero section CTA buttons
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Link
    href="/auth/sign-up"
    className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
  >
    Get Started Free
  </Link>
  <Link
    href="/pricing"
    className="border border-gray-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
  >
    View Pricing
  </Link>
</div>
```

**Navigation Updates:**

```tsx
// Add pricing link to navigation
const navItems = [
  { name: 'Features', href: '/#features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About', href: '/#about' },
];

// For authenticated users
const authNavItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Pricing', href: '/pricing' }, // Show if on free tier
];
```

### File Structure

```
src/lib/pricing/
├── tiers.ts              # Pricing tier configuration
├── index.ts              # Barrel export

components/pricing/
├── PricingCard.tsx       # Individual pricing card
├── BillingToggle.tsx     # Monthly/Annual toggle
├── PricingTable.tsx      # Comparison table
└── FAQ.tsx               # Pricing FAQ

app/(public)/pricing/
├── page.tsx              # Pricing page (RSC)
├── pricing-content-client.tsx  # Client component
├── actions.ts            # Server Actions
├── loading.tsx           # Loading state
└── error.tsx             # Error state
```

---

## Architectural Choices & Rationale

### 1. Server Actions vs API Routes

**Choice:** Use Server Actions for checkout and portal, API Route only for webhooks.

**Why:**
- **Server Actions** are the Next.js 16+ recommended pattern for form submissions and mutations
- **Better type safety** - TypeScript types flow through Server Actions
- **Automatic CSRF protection** - Built into Next.js
- **Simpler code** - No need for request/response handling
- **Better caching** - Can use `revalidatePath()` for cache invalidation
- **Webhook must be API Route** - External service (Stripe) calls it directly

**Trade-offs:**
- Server Actions can't be called via curl/HTTP (but webhooks can)
- Server Actions require authentication (handled by `requireUser()`)

### 2. Server-Side Price ID Resolution

**Choice:** Server resolves price IDs from `tier` + `billingPeriod`, never trusts client-provided price IDs.

**Why:**
- **Security** - Prevents price manipulation attacks
- **Single source of truth** - Price IDs stored in server-only env vars
- **Consistency** - Ensures correct price ID is always used
- **Flexibility** - Can change prices in Stripe without code changes (just update env vars)

**Implementation:**
```typescript
// Server Action resolves price ID
const priceId = resolvePriceId(tier, billingPeriod);
// resolvePriceId() reads from STRIPE_PRICE_{TIER}_{BILLING} env vars
```

**Why Client-Side Price IDs Are Optional:**
- Used only for display on pricing page
- Server ignores client-provided values
- Optional - pricing page works without them

### 3. Controller Layer Pattern

**Choice:** Server Actions call Controllers, Controllers call Services.

**Why:**
- **Separation of concerns** - Controllers handle request/response, Services handle business logic
- **Reusability** - Controllers can be called by both Server Actions and API Routes
- **Testability** - Each layer can be tested independently
- **Follows MVC pattern** - Aligns with project architecture guidelines

**Implementation:**
- Controllers have two types of methods:
  - **Data methods** - Return DTOs (for Server Actions)
  - **HTTP methods** - Return NextResponse (for API Routes)

### 4. Idempotency Keys

**Choice:** Use idempotency keys for all Stripe POST operations.

**Why:**
- **Prevents duplicate charges** - Network retries won't create duplicate subscriptions
- **Stripe best practice** - Recommended by Stripe documentation
- **Fault tolerance** - Handles network failures gracefully

**Implementation:**
```typescript
const idempotencyKey = `checkout_${profile.id}_${Date.now()}`;
await stripe.checkout.sessions.create(params, { idempotencyKey });
```

### 5. Webhook Idempotency

**Choice:** Check `stripe_event_id` before processing webhooks.

**Why:**
- **Stripe can send duplicate events** - Network issues, retries, etc.
- **Prevents duplicate processing** - Same event won't update database twice
- **Audit trail** - All events logged in `stripe_transactions` table

**Implementation:**
```typescript
// Check if event already processed
const existing = await findTransactionByEventId(event.id);
if (existing) {
  return { received: true, duplicate: true };
}
```

### 6. Transaction Logging

**Choice:** Log all Stripe operations in `stripe_transactions` table.

**Why:**
- **Audit trail** - Complete history of all payments and subscriptions
- **Dispute resolution** - Can prove what happened and when
- **Debugging** - Easy to trace issues
- **Compliance** - Required for financial record-keeping

### 7. Monthly and Annual Billing

**Choice:** Support both monthly and annual billing with separate price IDs.

**Why:**
- **User preference** - Some prefer monthly, others annual
- **Annual discount** - Encourages longer commitments
- **Flexibility** - Can adjust pricing independently

**Implementation:**
- Separate Stripe price IDs for monthly/annual
- Server resolves correct price ID based on `billingPeriod`
- Client can toggle between monthly/annual on pricing page

### 8. 14-Day Free Trial

**Choice:** Offer 14-day free trial for all paid tiers.

**Why:**
- **Reduces friction** - Users can try before committing
- **Increases conversions** - Lowers barrier to entry
- **Industry standard** - Common SaaS practice

**Implementation:**
- Trial period set in checkout session: `trial_period_days: 14`
- User gets immediate access to paid features
- First charge occurs after trial ends

---

## Quick Start

### 1. Verify Environment Setup

```bash
npm run check:stripe
```

### 2. Set Up Stripe Test Products

1. Go to https://dashboard.stripe.com/test/products
2. Create products with prices:
   - Basic Monthly ($5.99/month)
   - Basic Annual ($59.99/year)
   - Premium Monthly ($15.99/month)
   - Premium Annual ($159.99/year)
3. Copy Price IDs (start with `price_test_`)
4. Add to `.env.local`:

```bash
# Server-side (required)
STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...

# Client-side display (optional)
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...
```

### 3. Set Up Webhook Testing (Optional)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy webhook secret and add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

### 4. Test Checkout

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3000/pricing
3. Click "Start 14-Day Free Trial" on Basic or Premium
4. Use test card: `4242 4242 4242 4242`
5. Verify success: Redirected to `/dashboard?upgraded=true`

### Test Card Numbers

| Purpose | Card Number | Expiry | CVC |
|---------|------------|--------|-----|
| Successful | 4242 4242 4242 4242 | Any future date | Any 3 digits |
| Declined | 4000 0000 0000 0002 | Any future date | Any 3 digits |
| Requires auth | 4000 0025 0000 3155 | Any future date | Any 3 digits |

---

## Setup Guide

### 1. Stripe Account Setup

1. **Create Stripe Account**
   - Go to https://dashboard.stripe.com/register
   - Complete account verification

2. **Get API Keys**
   - Navigate to **Developers** → **API Keys**
   - Copy **Publishable Key** (starts with `pk_`)
   - Copy **Secret Key** (starts with `sk_`)
   - Use test mode keys initially

3. **Get Webhook Secret**
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Enter URL: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy **Signing Secret** (starts with `whsec_`)

### 2. Create Stripe Products and Prices

In Stripe dashboard, go to **Products** → **Create product**:

**Basic Tier (Monthly)**
- Name: "Portfolio Tracker - Basic (Monthly)"
- Description: "Advanced AI analysis and unlimited portfolio changes"
- Type: Recurring
- Price: $5.99 USD, Monthly, recurring
- Copy Price ID (starts with `price_test_`)

**Basic Tier (Annual)**
- Name: "Portfolio Tracker - Basic (Annual)"
- Price: $59.99 USD, Yearly, recurring
- Copy Price ID

**Premium Tier (Monthly)**
- Name: "Portfolio Tracker - Premium (Monthly)"
- Description: "Everything in Basic, plus technical analysis and Monte Carlo simulations"
- Price: $15.99 USD, Monthly, recurring
- Copy Price ID

**Premium Tier (Annual)**
- Name: "Portfolio Tracker - Premium (Annual)"
- Price: $159.99 USD, Yearly, recurring
- Copy Price ID

### 3. Environment Variables

Create or update `.env.local`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_test_xxx...

# Server-side Price IDs (required)
STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...

# Client-side Price IDs (optional - for display only)
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...
```

**Verify Configuration:**
```bash
npm run check:stripe
```

### 4. Database Schema

Ensure `profiles` table includes:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
```

### 5. Production Deployment

**Before Going Live:**

1. **Switch to Live Mode**
   - Go to **Developers** → **API Keys**
   - Toggle to **Live Mode**
   - Copy live keys

2. **Create Live Products**
   - Repeat product creation with Live Mode enabled
   - Copy live Price IDs

3. **Create Live Webhook**
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select same events
   - Copy live webhook secret

4. **Update Production Environment Variables**
   - Update all env vars with live values
   - Use `sk_live_`, `pk_live_`, `whsec_live_` prefixes

5. **Deploy and Test**
   - Deploy application
   - Test with real card (small amount)
   - Verify webhook received

---

## Testing Guide

### Prerequisites

1. **Stripe Test Account** - Test mode enabled
2. **Stripe CLI** (optional) - For local webhook testing
3. **Environment Variables** - All required vars configured

### Step 1: Verify Environment Setup

```bash
# Run verification script
npm run check:stripe

# Or manually check
echo $STRIPE_SECRET_KEY
echo $STRIPE_PRICE_BASIC_MONTHLY
echo $STRIPE_PRICE_BASIC_ANNUAL
```

### Step 2: Set Up Webhook Testing (Local)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login and forward webhooks
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy webhook secret and add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

### Step 3: Test Checkout Flow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to Pricing Page**
   - Go to http://localhost:3000/pricing
   - Sign in or sign up if needed

3. **Test Checkout**
   - Click "Start 14-Day Free Trial" on Basic or Premium
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

4. **Verify Success**
   - Redirected to `/dashboard?upgraded=true`
   - Check Stripe Dashboard → Customers
   - Check Stripe Dashboard → Subscriptions
   - Verify user tier updated in database

### Step 4: Test Different Scenarios

#### Test Trial Period
- Complete checkout with Basic or Premium
- Verify no immediate charge
- Check trial end date in Stripe Dashboard
- Verify user tier upgraded immediately

#### Test Monthly vs Annual
- Toggle billing period on pricing page
- Complete checkout for each
- Verify correct price ID used
- Verify correct amount charged

#### Test Payment Failure
- Use declined card: `4000 0000 0000 0002`
- Verify error message shown
- Verify no subscription created

#### Test Cancel Flow
- Complete successful checkout
- Go to Customer Portal
- Cancel subscription
- Verify webhook `customer.subscription.deleted` received
- Verify user tier downgraded to `free`

#### Test Post-Auth Checkout
- Log out
- Navigate to pricing page
- Click "Start Trial" on paid tier
- Complete authentication
- Verify checkout automatically resumes

### Step 5: Verify Webhook Processing

1. **Check Stripe CLI Output**
   ```
   --> checkout.session.completed [200]
   --> customer.subscription.created [200]
   --> invoice.payment_succeeded [200]
   ```

2. **Check Server Logs**
   - Webhook received confirmation
   - User tier update
   - Transaction logging

3. **Verify Database**
   ```sql
   SELECT id, email, tier, stripe_customer_id, stripe_subscription_id, subscription_status
   FROM profiles
   WHERE stripe_customer_id IS NOT NULL;
   ```

### Step 6: Debugging Common Issues

**"Price ID not configured"**
- Verify server-side env vars are set
- Ensure price IDs match Stripe dashboard
- Check you're using test mode price IDs (`price_test_`)

**"Failed to create checkout session"**
- Check `STRIPE_SECRET_KEY` is set correctly
- Verify key is in test mode (`sk_test_`)
- Check server logs for detailed error
- Verify user is authenticated

**Webhooks not received**
- Ensure Stripe CLI is running
- Check `STRIPE_WEBHOOK_SECRET` matches CLI output
- Verify webhook endpoint is accessible
- Check Stripe Dashboard → Webhooks for delivery attempts

**User tier not updating**
- Check webhook handler logs
- Verify webhook signature validation
- Check database connection
- Verify user ID is in subscription metadata

### Step 7: Verify in Stripe Dashboard

After successful checkout:

1. **Customers**: https://dashboard.stripe.com/test/customers
   - Test customer should appear
   - Customer ID matches `stripe_customer_id` in database

2. **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
   - Active subscription should appear
   - Subscription ID matches `stripe_subscription_id` in database
   - Trial period visible (if applicable)

3. **Events**: https://dashboard.stripe.com/test/events
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

### Step 8: Production Testing Checklist

Before going to production:

- [ ] Switch Stripe Dashboard to Live Mode
- [ ] Update all environment variables with live keys
- [ ] Update webhook endpoint URL in Stripe Dashboard
- [ ] Test with real card (use small amount)
- [ ] Verify webhook signature with live secret
- [ ] Test subscription cancellation
- [ ] Test payment failure handling
- [ ] Monitor Stripe Dashboard for errors
- [ ] Set up Stripe email notifications
- [ ] Configure dunning management (failed payment retries)

---

## Additional Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Documentation**: https://stripe.com/docs
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Test Card Numbers**: https://stripe.com/docs/testing
- **Webhook Events**: https://stripe.com/docs/api/events
- **Stripe Node.js Reference**: https://stripe.com/docs/api/node

---

## Support

**For Stripe integration issues:**
- Check Stripe dashboard logs
- Review error messages in server logs
- Test with Stripe CLI locally
- Contact Stripe support: support@stripe.com

**For Portfolio Tracker integration issues:**
- Check webhook handler at `app/api/stripe/webhook/route.ts`
- Verify database schema matches expectations
- Check environment variables are set (run `npm run check:stripe`)
- Review server logs for errors
