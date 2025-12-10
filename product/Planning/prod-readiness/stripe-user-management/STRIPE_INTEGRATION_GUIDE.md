# Stripe Integration Guide

Complete guide for Stripe payment integration in Portfolio Tracker, including design decisions, workflows, pricing page implementation, setup, and testing.

**Last Updated**: December 9, 2025

**Table of Contents:**
- [Design & Architecture](#design--architecture)
- [Configuration & Setup](#configuration--setup)
- [User Journey & Subscription Flows](#user-journey--subscription-flows)
- [Security Best Practices](#security-best-practices)
- [Pricing & Landing Page Implementation](#pricing--landing-page-implementation)
- [Architectural Choices & Rationale](#architectural-choices--rationale)
- [Quick Start](#quick-start)
- [Setup Guide](#setup-guide)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)

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

---

## Configuration & Setup

### Central Configuration

All subscription plans and Price ID mappings are centralized in:
**`src/backend/modules/subscriptions/config/plans.config.ts`**

This module provides:
- **Plan tier definitions**: `PlanTier` enum (`FREE`, `BASIC`, `PREMIUM`)
- **Price ID mappings**: `STRIPE_PRICE_IDS` (tier → interval → Price ID)
- **Plan metadata**: Features, pricing, trial periods for UI display
- **Helper functions**: `getStripePriceId()`, `getTierFromPriceId()`, `requiresStripeCheckout()`, `isHigherTier()`
- **Startup validation**: `validateStripePriceIds()` - catches configuration errors early

**Key principle**: Price IDs are **NEVER exposed to the client**. The server resolves them using `resolvePriceId(tier, billingPeriod)`.

### Environment Variables

**Required Variables (`.env.local`):**
```bash
# Stripe API Keys (get from: https://dashboard.stripe.com/test/developers)
STRIPE_SECRET_KEY=sk_test_xxx...  # Required: Server-side Stripe API
STRIPE_WEBHOOK_SECRET=whsec_test_xxx...  # Required: Webhook signature verification

# Stripe Price IDs - ONLY for PAID tiers (Free tier has no Stripe prices)
# Get from: Stripe Dashboard → Products → [Product] → Pricing
# Format: price_XXXXXXXXXX (auto-generated by Stripe)
STRIPE_PRICE_BASIC_MONTHLY=price_test_xxx...
STRIPE_PRICE_BASIC_ANNUAL=price_test_xxx...
STRIPE_PRICE_PREMIUM_MONTHLY=price_test_xxx...
STRIPE_PRICE_PREMIUM_ANNUAL=price_test_xxx...
```

**Important Notes:**
- ❌ **DO NOT** use `NEXT_PUBLIC_*` env vars for Price IDs (security risk)
- ✅ **DO** use server-only env vars (`STRIPE_PRICE_*`)
- ✅ Free tier has **NO** Stripe Price IDs (handled in application logic)
- ✅ Price IDs are auto-generated by Stripe (format: `price_XXXXXXXXXX`)
- ℹ️ **Client-side key NOT required**: App uses server-side Stripe Checkout Sessions & Customer Portal (no client-side Stripe.js)

### How to Get Stripe Price IDs

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Create or select a product (e.g., "Basic Plan")
3. Create monthly and annual prices
4. Copy each Price ID (starts with `price_`)
5. Add to `.env.local`

**Validation**: The app validates all Price IDs at startup using `validateStripePriceIds()` from `plans.config.ts`.

---

## Security Best Practices

### ✅ Price ID Security

**Problem**: Exposing Price IDs to the client allows users to manipulate prices.

**Solution**: Server-side resolution only.

```typescript
// ❌ DON'T: Trust client-provided priceId
async function checkout(data: { priceId: string }) {
  const { priceId } = data; // Client could send ANY price ID
  await createCheckoutSession(priceId);
}

// ✅ DO: Resolve price ID server-side
async function checkout(data: { tier: string; billingPeriod: string }) {
  const { tier, billingPeriod } = data;
  const priceId = resolvePriceId(tier, billingPeriod); // Server resolves from env
  await createCheckoutSession(priceId);
}
```

### ✅ Webhook Security

**Problem**: Anyone can send fake webhook events to your endpoint.

**Solution**: Always verify Stripe signatures.

```typescript
// Verify webhook signature
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### ✅ Metadata for User Identification

**Problem**: Webhooks need to know which user to update.

**Solution**: Include `userId` in checkout session metadata.

```typescript
const session = await stripe.checkout.sessions.create({
  // ...
  metadata: {
    userId: profile.id, // Critical for webhook handling
  },
});
```

---

## User Journey & Subscription Flows

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

### 5. Subscription Management Flow

**Using Stripe Customer Portal (Recommended)**

The app uses Stripe's built-in Customer Portal for all subscription management:
- ✅ Update payment method
- ✅ Change plan (upgrade/downgrade)
- ✅ Cancel subscription
- ✅ View invoices
- ✅ Update billing information

**Flow**:
```
/billing page → "Manage Subscription" button
    ↓
Server Action: createPortalSession()
    ↓
Redirects to: Stripe Customer Portal
    ↓
User makes changes
    ↓
Webhooks update database automatically
```

**Benefits**:
- Stripe handles all UI/UX
- PCI compliance built-in
- Supports all payment methods
- Automatic invoice generation
- Dunning management (failed payment retries)

### 6. Payment Failure Flow

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

import { getAllPlanMetadata } from '@/src/backend/modules/subscriptions/config/plans.config';
import { PricingCard } from '@/components/pricing/PricingCard';

const PRICING_TIERS = getAllPlanMetadata();

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

## Troubleshooting

### Common Issues & Solutions

#### Issue: "Price ID not configured"

**Error Message**: `Price ID not configured: STRIPE_PRICE_BASIC_MONTHLY environment variable is missing`

**Cause**: Missing or incorrect environment variable in `.env.local`

**Solution**:
1. Check `.env.local` has all required Price IDs
2. Verify Price IDs start with `price_`
3. Ensure you're using correct format: `STRIPE_PRICE_{TIER}_{INTERVAL}`
4. Restart dev server: `npm run dev`

**Verify Configuration**:
```typescript
// Check plans.config.ts is loaded correctly
import { STRIPE_PRICE_IDS } from '@backend/modules/subscriptions/config/plans.config';
console.log(STRIPE_PRICE_IDS);
```

#### Issue: "Invalid Price ID format"

**Error Message**: `Invalid Price ID format for STRIPE_PRICE_BASIC_MONTHLY: price_basic_monthly_dev`

**Cause**: Price ID is not a real Stripe-generated ID

**Solution**:
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Find your product (e.g., "Basic Plan")
3. Copy the **actual Price ID** (format: `price_1ScZskPLpdAQZEGgf65WeJfr`)
4. Update `.env.local` with real Price ID
5. Restart dev server

**Note**: Price IDs are auto-generated by Stripe and look like `price_1XXXXXXXXXX`, NOT `price_basic_monthly_dev`

#### Issue: Tier not updating after payment

**Symptoms**: User completes checkout but remains on Free tier

**Cause**: Webhook not fired or failed to process

**Solution**:
1. **Check webhook is configured**:
   - Go to Stripe Dashboard → Webhooks
   - Verify endpoint URL is correct
   - Ensure required events are selected:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. **Check webhook secret**:
   - Verify `STRIPE_WEBHOOK_SECRET` in `.env.local`
   - Should start with `whsec_`

3. **Check webhook logs**:
   - Stripe Dashboard → Webhooks → [Your endpoint]
   - View recent deliveries and response codes
   - Look for 4xx or 5xx errors

4. **Verify metadata**:
   ```typescript
   // Checkout session MUST include userId in metadata
   metadata: {
     userId: profile.id, // Critical!
   }
   ```

5. **Check server logs**:
   ```bash
   # Look for webhook processing logs
   ✅ Checkout completed: User {userId} → {tier}
   ✅ Subscription updated: User {userId} → {tier}
   ```

#### Issue: "Stripe is not configured"

**Error Message**: `Stripe is not configured` or `STRIPE_SECRET_KEY is not configured`

**Cause**: Missing `STRIPE_SECRET_KEY` environment variable

**Solution**:
1. Get API keys from [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/developers)
2. Add to `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_51...
   ```
3. Restart dev server

**Verify**:
```bash
# Check if Stripe initializes correctly
npm run dev
# Should see: ✓ Stripe Price IDs validated
```

#### Issue: Webhooks not received locally

**Symptoms**: Payments complete in Stripe but no database updates

**Cause**: Webhooks not forwarded to localhost

**Solution**:
1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy webhook secret**:
   ```bash
   # Stripe CLI will output:
   # Your webhook signing secret is whsec_xxxxx
   
   # Add to .env.local
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

5. **Restart dev server**:
   ```bash
   npm run dev
   ```

**Verify**:
```bash
# In Stripe CLI output, you should see:
--> checkout.session.completed [200]
--> customer.subscription.created [200]
```

#### Issue: "Failed to create checkout session"

**Error Message**: Various errors when clicking "Subscribe"

**Possible Causes & Solutions**:

1. **User not authenticated**:
   - Verify user is signed in
   - Check `requireUser()` is called in Server Action

2. **Invalid Price ID**:
   - Run `validateStripePriceIds()` on startup
   - Check all Price IDs exist in Stripe Dashboard
   - Ensure Price IDs are active (not archived)

3. **Stripe API key incorrect**:
   - Verify `STRIPE_SECRET_KEY` starts with `sk_test_` (test mode)
   - Check key has not been revoked
   - Test mode vs live mode mismatch

4. **Network issues**:
   - Check internet connection
   - Verify Stripe API is accessible
   - Check for firewall/proxy issues

**Debug**:
```typescript
// Add logging to Server Action
console.log('Creating checkout:', { tier, billingPeriod });
const priceId = resolvePriceId(tier, billingPeriod);
console.log('Resolved Price ID:', priceId);
```

#### Issue: Customer Portal not working

**Error Message**: Portal session creation fails or shows error

**Solution**:
1. **Enable Customer Portal** in Stripe Dashboard:
   - Go to Settings → Billing → Customer Portal
   - Click "Activate"
   - Configure features (subscription updates, payment methods, etc.)

2. **Verify Customer exists**:
   - Check user has `stripe_customer_id` in database
   - If missing, re-run checkout flow

3. **Check Stripe keys**:
   - Ensure using correct mode (test vs live)
   - Verify `STRIPE_SECRET_KEY` is valid

### Validation & Debugging Tools

#### Startup Validation

The app validates all Price IDs when it starts:

```typescript
// In plans.config.ts
validateStripePriceIds(); // Runs on module load
```

**Expected output**:
```
✓ Stripe Price IDs validated
```

**Error output**:
```
❌ Stripe Price ID Configuration Errors:
  - Missing STRIPE_PRICE_BASIC_MONTHLY
  - Invalid Price ID for premium monthly: "price_xyz"
```

#### Manual Price ID Verification

Create a script to verify all Price IDs:

```typescript
// scripts/verify-stripe-prices.ts
import Stripe from 'stripe';
import { STRIPE_PRICE_IDS } from '@backend/modules/subscriptions/config/plans.config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function verifyPrices() {
  for (const [tier, intervals] of Object.entries(STRIPE_PRICE_IDS)) {
    if (tier === 'free') continue;
    
    for (const [interval, priceId] of Object.entries(intervals)) {
      if (!priceId) {
        console.error(`❌ Missing Price ID: ${tier} ${interval}`);
        continue;
      }
      
      try {
        const price = await stripe.prices.retrieve(priceId);
        console.log(`✅ ${tier} ${interval}: ${priceId} (${price.active ? 'active' : 'inactive'})`);
      } catch (error) {
        console.error(`❌ ${tier} ${interval}: ${priceId} - ${error.message}`);
      }
    }
  }
}

verifyPrices();
```

Run:
```bash
npx tsx scripts/verify-stripe-prices.ts
```

### Database Verification Queries

Check subscription data integrity:

```sql
-- Check users with subscriptions
SELECT 
  id,
  email,
  tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end
FROM profiles
WHERE stripe_customer_id IS NOT NULL;

-- Check users on paid tiers without Stripe subscription
SELECT id, email, tier
FROM profiles
WHERE tier IN ('basic', 'premium')
  AND stripe_subscription_id IS NULL;

-- Check subscription status mismatches
SELECT id, email, tier, subscription_status
FROM profiles
WHERE tier = 'free' AND subscription_status = 'active';
```

---

## Subscription Sync - Fixing Stripe/Supabase Mismatches

### Problem Overview

When a subscription was created in Stripe before the `userid` metadata fix, the Supabase database may not have a corresponding subscription record. This causes:
- User's billing page shows incorrect tier
- Sync operations fail with "no active subscription" errors
- Mismatches between Stripe and database data

### Solution Architecture

The subscription sync functionality uses RSC-first architecture with proper MVC layer separation:

```
Admin UI (Client Component with button)
    ↓
Server Action (syncUserSubscription)
    ↓
Admin Controller (validation)
    ↓
Admin Service (metadata lookup + sync logic)
    ↓
Stripe API (search by userid metadata)
    ↓
DAO (update DB)
```

### Sync Behavior

**When there's a mismatch, sync always takes Stripe as the source of truth:**

| Field | Source | Logic |
|-------|--------|-------|
| `subscription_status` | Stripe | Direct from `subscription.status` |
| `tier` | Stripe | Derived from price ID, set to `free` if status is inactive |
| `subscription_tier` | Stripe | Tier from price ID (regardless of status) |
| `stripe_customer_id` | Stripe | Added/updated |
| `stripe_subscription_id` | Stripe | Added/updated |
| `current_period_start/end` | Stripe | Billing period dates |
| `cancel_at_period_end` | Stripe | Cancellation status |
| `trial_ends_at` | Stripe | Trial end date |

**Tier Sync Logic:**
```typescript
const tier = getTierFromPriceId(subscription.items.data[0]?.price?.id) || 'free';
const isActive = subscription.status === 'active' || subscription.status === 'trialing';
const finalTier = isActive ? tier : 'free';  // Force to 'free' if inactive
```

**Examples:**
- Stripe status `"active"` + price → basic = DB tier `"basic"`
- Stripe status `"canceled"` + price → basic = DB tier `"free"`
- Stripe status `"trialing"` + price → premium = DB tier `"premium"`

### How It Works: Detailed Flow

#### 1. Mismatch Detection Process

**Step 1: Query Stripe**
```typescript
const allSubs = await stripe.subscriptions.list({
  expand: ['data.customer'],
  limit: 100
});
const subsWithUserid = allSubs.data.filter(sub => sub.metadata?.userid);
```

**Step 2: Database Lookup**
```sql
SELECT id, email, tier, subscription_status, stripe_subscription_id
FROM profiles
WHERE id = :userid
```

**Step 3: Comparison Logic**

Detect four types of mismatches:
- **Missing in DB**: Stripe has subscription, DB `stripe_subscription_id` is null
- **ID Mismatch**: DB has different `stripe_subscription_id` than Stripe
- **Status Mismatch**: Stripe status differs from DB `subscription_status`
- **Tier Mismatch**: Derived tier from Stripe price ID differs from DB `tier`

**Step 4: Tier Derivation**
```typescript
const tierMapping = {
  'price_basic_monthly': 'basic',
  'price_basic_yearly': 'basic',
  'price_premium_monthly': 'premium',
  'price_premium_yearly': 'premium'
};

const tier = subscription.status === 'active' || subscription.status === 'trialing'
  ? tierMapping[subscription.items.data[0].price.id] ?? 'free'
  : 'free';
```

#### 2. Sync Operation Flow

**Step 1: Locate Subscription**

Two lookup methods:
- **Primary**: Use `stripe_subscription_id` from DB if available
- **Fallback**: Query Stripe by `metadata.userid` if DB field is null

**Step 2: Extract Stripe Data**
```typescript
const subscription = await stripe.subscriptions.retrieve(stripeSubId);
const priceId = subscription.items.data[0]?.price.id;
const tier = getTierFromPriceId(priceId);
const status = subscription.status;
const subscriptionId = subscription.id;
```

**Step 3: Update Database**
```sql
UPDATE profiles
SET tier = :tier,
    subscription_status = :status,
    stripe_subscription_id = :subscriptionId,
    stripe_customer_id = :customerId,
    current_period_start = :periodStart,
    current_period_end = :periodEnd,
    cancel_at_period_end = :cancelAtEnd,
    trial_ends_at = :trialEnd
WHERE id = :userId
```

**Step 4: Validation**
```typescript
const updated = await getProfile(userId);
if (updated.stripe_subscription_id !== subscriptionId) {
  throw new Error('Sync verification failed');
}
```

#### 3. Source of Truth Rule

**Stripe is ALWAYS the source of truth**

- DB subscriptions that don't exist in Stripe → Ignored (considered stale data)
- Stripe subscriptions without DB match → Synced to DB
- Conflicts between Stripe and DB → Stripe wins, DB is updated

#### 4. Example Scenarios

**Scenario 1: Legacy Subscription (No Metadata)**

Before metadata fix was implemented, subscription exists in Stripe but not tracked in DB:

1. **Before Sync:**
   - Stripe: `sub_abc123`, status: `active`, price: `price_premium_monthly`
   - DB: `stripe_subscription_id` = `null`

2. **Detection:** ✅ Mismatch found (missing in DB)

3. **Sync Action:** Search Stripe by `metadata.userid`, update DB with subscription details

4. **After Sync:**
   - DB: `tier='premium'`, `subscription_status='active'`, `stripe_subscription_id='sub_abc123'`

**Scenario 2: Status Drift**

User canceled in Stripe but DB not updated (webhook missed):

1. **Before Sync:**
   - Stripe: `sub_xyz789`, status: `canceled`
   - DB: `stripe_subscription_id='sub_xyz789'`, `subscription_status='active'`

2. **Detection:** ✅ Mismatch found (status differs)

3. **Sync Action:** Retrieve subscription from Stripe, update DB with new status

4. **After Sync:**
   - DB: `tier='free'`, `subscription_status='canceled'`

**Scenario 3: Upgrade Not Reflected**

User upgraded from Basic to Premium in Stripe:

1. **Before Sync:**
   - Stripe: `sub_def456`, status: `active`, price: `price_premium_monthly`
   - DB: `stripe_subscription_id='sub_def456'`, `tier='basic'`

2. **Detection:** ✅ Mismatch found (tier differs)

3. **Sync Action:** Retrieve subscription, derive tier from new price ID

4. **After Sync:**
   - DB: `tier='premium'`

### Mismatch Detection

The system detects mismatches **regardless of tier** by comparing:

1. **Missing DB subscription**: Stripe has subscription but DB `stripe_subscription_id` is null
2. **Subscription ID mismatch**: Stripe subscription ID ≠ DB subscription ID
3. **Status mismatch**: Stripe status ≠ DB `subscription_status`
4. **Tier mismatch**: Stripe-derived tier ≠ DB `tier`

### Admin UI Integration

**Location:** `/admin/users/[userId]` page

**ErrorsMismatches Component** displays:
- Clear warnings with Stripe vs DB comparisons
- "Sync from Stripe" button when mismatches detected
- Success/error messages after sync attempts

**Example Warning:**
```
⚠️ ERROR
Missing DB subscription record. Stripe has subscription (sub_1abc...) 
but DB shows no subscription. Use sync button to fix.
```

### Server Actions

**Location:** `app/(protected)/admin/actions.ts`

Three admin-only server actions:

1. **`detectSubscriptionMismatches()`**
   - Detects all subscription mismatches across all users
   - Returns detailed mismatch information
   - Admin-only access

2. **`syncUserSubscription(userId)`**
   - Syncs specific user's subscription from Stripe
   - Uses metadata-based lookup if no DB subscription_id
   - Updates all subscription fields
   - Admin-only access

3. **`syncAllMissingSubscriptions()`**
   - Syncs all mismatched subscriptions
   - Returns summary of synced/failed operations
   - Admin-only access

**Usage Example:**
```typescript
import { syncUserSubscription } from '@/app/(protected)/admin/actions';

// In admin page/component
await syncUserSubscription(userId);
```

### CLI Script for Manual Sync

**Location:** `scripts/sync-subscriptions.ts`

**Detect Only:**
```bash
npm run ts-node scripts/sync-subscriptions.ts --detect-only
```

**Sync Specific User:**
```bash
npm run ts-node scripts/sync-subscriptions.ts --email user@example.com
```

**Sync All Mismatches:**
```bash
npm run ts-node scripts/sync-subscriptions.ts --all
```

**Output Example:**
```
🔍 Subscription Sync Script
═══════════════════════════════════════════════════════════

🔍 Detecting subscription mismatches...

⚠️  Found 3 subscription mismatches:

┌─────────────────────────────────────┬──────────────────────┬──────────────┬────────────────┐
│ User Email                          │ Stripe Status        │ DB Status    │ Missing in DB  │
├─────────────────────────────────────┼──────────────────────┼──────────────┼────────────────┤
│ user@example.com                    │ active               │ null         │ YES            │
│ another@example.com                 │ trialing             │ canceled     │ No             │
└─────────────────────────────────────┴──────────────────────┴──────────────┴────────────────┘
```

### Implementation Details

**Metadata-Based Lookup:**
When `stripe_subscription_id` is missing in DB, the service:
1. Lists all Stripe subscriptions
2. Finds subscription where `metadata.userid` matches user ID
3. Updates DB with all subscription fields including IDs

**Service Method:** `syncUserSubscription()` in `src/backend/modules/admin/service/admin.service.ts`

```typescript
// If no DB subscription_id, search by metadata
const subscriptions = await stripe.subscriptions.list({
  limit: 100,
  expand: ['data.customer'],
});

const userSub = subscriptions.data.find(
  (sub) => sub.metadata?.userid === userId
);

if (userSub) {
  // Update DB with all Stripe data including customer_id and subscription_id
  await updateUser(userId, {
    stripe_customer_id: userSub.customer,
    stripe_subscription_id: userSub.id,
    subscription_status: userSub.status,
    // ... other fields
  });
}
```

### Automatic Sync on Billing Page

The billing service includes automatic sync when a user views their billing page:

1. User visits `/billing` page
2. `getSubscriptionInfo()` checks for mismatches between Stripe and DB
3. If mismatch detected, automatically attempts sync
4. Re-fetches data to verify sync succeeded
5. Displays current status with mismatch warning if sync failed

**Benefits:**
- Self-healing - Users can fix their own subscription issues
- Transparent - Shows sync attempt results to user
- Fallback - Admin can still manually sync if automatic fails

### Usage Examples

#### Fix Specific User

1. **Detect the mismatch:**
   ```bash
   npm run ts-node scripts/sync-subscriptions.ts --detect-only
   ```

2. **Sync the user:**
   ```bash
   npm run ts-node scripts/sync-subscriptions.ts --email user@example.com
   ```

3. **Verify:**
   - Check user's billing page
   - Verify subscription status in Supabase `profiles` table
   - Confirm user has access to paid features

#### Fix All Mismatches

```bash
npm run ts-node scripts/sync-subscriptions.ts --all
```

**Output:**
- Lists all subscriptions with `userid` metadata
- Compares with Supabase profiles
- Syncs all mismatches
- Displays summary of synced/failed operations

**Example Output:**
```
🔍 Subscription Sync Script
═══════════════════════════════════════════════════════════

⚠️  Found 3 subscription mismatches:

┌─────────────────────────────────────┬──────────────────────┬──────────────┬────────────────┐
│ User Email                          │ Stripe Status        │ DB Status    │ Missing in DB  │
├─────────────────────────────────────┼──────────────────────┼──────────────┼────────────────┤
│ user@example.com                    │ active               │ null         │ YES            │
│ another@example.com                 │ trialing             │ canceled     │ No             │
└─────────────────────────────────────┴──────────────────────┴──────────────┴────────────────┘

📊 Sync Results:
   ✅ Successfully synced: 2
   ❌ Failed: 1
```

### Troubleshooting Sync Issues

#### Sync Fails with "No active subscription"

**Cause:** Subscription doesn't have `userid` in metadata

**Solution:**
1. Manually add `userid` metadata to Stripe subscription
2. Go to Stripe Dashboard → Subscriptions → [Subscription] → Metadata
3. Add key: `userid`, value: `{user-uuid-from-database}`
4. Run sync script again

#### User Still Shows Wrong Tier After Sync

**Possible causes:**
- Subscription is inactive/canceled → Should show `free` tier ✅
- Price ID doesn't match configured tiers → Check `plans.config.ts`
- Sync succeeded but browser cache → Hard refresh (Ctrl+Shift+R)

**Verify:**
```sql
SELECT id, email, tier, subscription_status, stripe_subscription_id
FROM profiles
WHERE email = 'user@example.com';
```

#### "User not found in DB"

**Cause:** User exists in Stripe but not in Supabase

**Solution:**
1. Create user profile in Supabase first
2. Ensure correct UUID
3. Run sync script with user's email

#### Automatic Sync Not Working

**Cause:** Error in billing service or missing Stripe data

**Solution:**
1. Check browser console for errors
2. Verify Stripe API key is valid
3. Check server logs for detailed error messages
4. Use manual sync as fallback:
   ```bash
   npm run ts-node scripts/sync-subscriptions.ts --email user@example.com
   ```

### Files Changed

**Backend Services:**
- `src/backend/modules/billing/service/billing.service.ts` - Core sync logic
- `src/backend/modules/billing/controller/billing.controller.ts` - Controller layer
- `src/backend/modules/admin/service/admin.service.ts` - Admin sync with metadata lookup

**Server Actions:**
- `app/(protected)/admin/actions.ts` - Admin server actions

**Admin UI:**
- `app/(protected)/admin/users/[userId]/components/ErrorsMismatches.tsx` - Mismatch detection UI
- `app/(protected)/admin/users/[userId]/page.tsx` - Admin user detail page

**CLI Scripts:**
- `scripts/sync-subscriptions.ts` - Manual sync script

**Architecture Notes:**
- Follows RSC-first architecture (server actions, not API routes)
- Proper MVC layer separation (Server Actions → Controller → Service → DAO)
- Fixed deprecated imports (`getTierFromPriceId` from `plans.config.ts`)

---

## Additional Resources

### Stripe Documentation
- **Dashboard**: https://dashboard.stripe.com
- **API Reference**: https://stripe.com/docs/api
- **Webhooks Guide**: https://stripe.com/docs/webhooks
- **Testing**: https://stripe.com/docs/testing
- **Customer Portal**: https://stripe.com/docs/billing/subscriptions/customer-portal
- **Stripe CLI**: https://stripe.com/docs/stripe-cli

### Project-Specific Files
- **Central Config**: `src/backend/modules/subscriptions/config/plans.config.ts`
- **Server Actions**: `app/(public)/pricing/actions.ts`, `app/(protected)/billing/actions.ts`
- **Webhook Handlers**: `src/backend/modules/stripe/webhook-handlers.ts`
- **Stripe Client**: `src/lib/stripe/client.ts`
- **Complete Flow Docs**: `docs/STRIPE_SUBSCRIPTION_FLOW.md`

### Test Cards
```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Requires Authentication: 4000 0025 0000 3155
Insufficient Funds: 4000 0000 0000 9995
```

---

## Support

**For Stripe integration issues:**
- Check Stripe Dashboard → Events for webhook logs
- Review error messages in server logs
- Test with Stripe CLI locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Check [Stripe Documentation](https://stripe.com/docs)
- Contact Stripe Support: support@stripe.com

**For Portfolio Tracker integration issues:**
- Review `src/backend/modules/subscriptions/config/plans.config.ts`
- Check webhook handler: `app/api/stripe/webhook/route.ts`
- Verify environment variables with `validateStripePriceIds()`
- Review server logs for detailed errors
- Check database: `SELECT * FROM profiles WHERE stripe_customer_id IS NOT NULL`
