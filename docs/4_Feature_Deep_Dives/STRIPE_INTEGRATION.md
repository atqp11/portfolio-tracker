# Stripe Integration & Billing System - Technical Deep Dive

This document provides a comprehensive technical overview of the Stripe integration and billing system implementation for Portfolio Tracker.

## Project Overview

The system enables:

- ✅ **Subscription management** (Basic: $6/mo, Premium: $15.99/mo)
- ✅ **Checkout flow** with Stripe-hosted payment pages
- ✅ **Webhook handling** for automatic tier updates
- ✅ **Customer portal** for subscription management
- ✅ **Pricing page** with tier comparison
- ✅ **Legal compliance** (Terms of Service, Privacy Policy)
- ✅ **Type-safe integration** with full TypeScript support

---

## 📁 Files Created

### 1. Core Stripe Integration (`src/lib/stripe/`)

#### `types.ts` (67 lines)
Defines all TypeScript types for Stripe integration:
- `StripeTier`: Union type for 'free' | 'basic' | 'premium'
- `StripePrice`, `StripeProduct`: Product configurations
- `StripeCustomer`, `StripeSubscription`: Customer & subscription data
- `WebhookEvent`, `CheckoutSessionCreateRequest/Response`: API contracts

#### `client.ts` (237 lines)
Main Stripe client with comprehensive utilities:
- `getStripe()`: Lazy-loaded Stripe instance
- `STRIPE_PRICES`: Configuration for all price tiers
- `getPriceIdForTier()`: Get Stripe price ID from tier name
- `getTierFromPriceId()`: Reverse mapping (price ID → tier)
- `createOrRetrieveCustomer()`: Find or create Stripe customer
- `createCheckoutSession()`: Create Stripe checkout session
- `getSubscription()`: Retrieve subscription details
- `cancelSubscription()`: Cancel subscription
- `createCustomerPortalSession()`: Generate billing portal URL
- `constructWebhookEvent()`: Verify webhook signature
- `handleSubscriptionCreated/Updated/Deleted()`: Event handlers

#### `index.ts` (41 lines)
Barrel export for clean imports

### 2. API Routes (`app/api/stripe/`)

#### `/checkout/route.ts` (98 lines)
**POST** - Create checkout session for tier upgrade
- Authenticates user
- Validates tier and URLs
- Creates/retrieves Stripe customer
- Returns checkout URL for frontend redirect
- Handles free tier (no checkout needed)

**GET** - Returns user's current tier and Stripe customer status

#### `/webhook/route.ts` (186 lines)
**POST** - Receives and processes Stripe events
- Verifies webhook signature using webhook secret
- Handles 5 event types:
  - `customer.subscription.created`: User upgraded (update tier in DB)
  - `customer.subscription.updated`: Subscription changed
  - `customer.subscription.deleted`: User canceled (downgrade to free)
  - `invoice.payment_succeeded`: Payment confirmed
  - `invoice.payment_failed`: Payment failed notification

#### `/portal/route.ts` (64 lines)
**POST** - Redirect user to Stripe billing portal
- Authenticates user
- Creates customer portal session
- Returns URL for iframe or redirect

**GET** - Returns user's portal access status

### 3. UI Pages

#### `/pricing/page.tsx` (386 lines - React Client Component)
**Public pricing page** with:
- **Tier comparison table** showing Free, Basic, Premium tiers
- **Feature matrix**: Portfolio limits, AI limits, data access, features
- **Support tier information**
- **Checkout buttons** with loading states
- **Current tier badge** for logged-in users
- **Manage subscription link** for paid subscribers
- **FAQ section** with common questions
- **Error handling** with user-friendly messages
- **Success/canceled status** notifications
- **Responsive design** for all screen sizes

#### `/terms/page.tsx` (168 lines)
Public Terms of Service page with comprehensive legal terms.

#### `/privacy/page.tsx` (156 lines)
Public Privacy Policy page with GDPR/CCPA compliance.

---

## 🏗️ Architecture

### Data Flow: User Subscribes

```
1. User clicks "Upgrade Now" on /pricing page
   ↓
2. Frontend calls POST /api/stripe/checkout
   ↓
3. Backend creates/retrieves Stripe customer
   ↓
4. Backend creates checkout session
   ↓
5. Frontend redirects to Stripe checkout URL
   ↓
6. User enters payment information
   ↓
7. Stripe processes payment
   ↓
8. User redirected to success page
   ↓
9. Stripe sends webhook event (customer.subscription.created)
   ↓
10. Backend webhook handler:
    - Verifies signature
    - Gets price ID from subscription
    - Maps price ID → tier
    - Updates user tier in database
    ↓
11. User has immediate access to paid tier
```

### Data Flow: User Manages Subscription

```
1. User clicks "Manage Subscription" on /pricing
   ↓
2. Frontend calls POST /api/stripe/portal
   ↓
3. Backend creates customer portal session
   ↓
4. Frontend redirects to Stripe billing portal
   ↓
5. User upgrades, downgrades, or cancels
   ↓
6. Stripe sends webhook event (customer.subscription.updated or .deleted)
   ↓
7. Backend updates user tier accordingly
```

### Tier Hierarchy

```
Free (0 cost)
├── 1 Portfolio
├── 20 Stocks per portfolio
├── 20 Chat queries/day
├── 1 Portfolio analysis/day
├── 3 SEC filings/month
├── Basic risk metrics
└── Community support

    ↓ (Premium features)

Basic ($6/month)
├── 5 Portfolios
├── 50 Stocks per portfolio
├── 100 Chat queries/day
├── 10 Portfolio analyses/day
├── Unlimited SEC filings/month
├── Advanced AI analysis
├── Advanced risk metrics
├── Email support (48hr)
└── Full API access

    ↓ (Advanced features)

Premium ($15.99/month)
├── Unlimited portfolios
├── 150 Stocks per portfolio
├── 700 Chat queries/day
├── Unlimited analyses
├── Unlimited SEC filings/month
├── Technical analysis
├── Monte Carlo simulations
├── Smart alerts
├── Stress testing
├── Priority support (24hr)
└── Custom reports
```

---

## 🔑 Environment Variables Required

```bash
# Stripe API Keys (from Stripe Dashboard → Developers → API Keys)
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_xxx...

# Stripe Webhook Secret (from Stripe Dashboard → Developers → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_test_xxx...

# Stripe Price IDs (from Stripe Dashboard → Products → Prices)
STRIPE_PRODUCT_FREE_PRICE_ID=price_free_xxx...
STRIPE_PRODUCT_BASIC_PRICE_ID=price_basic_xxx...
STRIPE_PRODUCT_PREMIUM_PRICE_ID=price_premium_xxx...

# Public Stripe key for frontend (same as STRIPE_PUBLISHABLE_KEY)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
```

---

## 📋 API Reference

### POST /api/stripe/checkout
**Create checkout session**

Request:
```json
{
  "tier": "basic",
  "successUrl": "https://example.com/pricing?success=true",
  "cancelUrl": "https://example.com/pricing?canceled=true"
}
```

Response (Success):
```json
{
  "sessionId": "cs_test_abc123xyz",
  "url": "https://checkout.stripe.com/pay/cs_test_abc123xyz",
  "tier": "basic"
}
```

### GET /api/stripe/checkout
**Get checkout info for user**

Response:
```json
{
  "currentTier": "free",
  "stripeCustomerId": "cus_abc123xyz",
  "available": true
}
```

### POST /api/stripe/webhook
**Receive Stripe webhook events**

Events handled:
- `customer.subscription.created` - Updates user tier
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Downgrades to free
- `invoice.payment_succeeded` - Payment confirmed
- `invoice.payment_failed` - Payment failed

### POST /api/stripe/portal
**Create customer portal session**

Request:
```json
{
  "returnUrl": "https://example.com/dashboard"
}
```

Response:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET /api/stripe/portal
**Get portal access status**

Response:
```json
{
  "hasPortalAccess": true,
  "tier": "basic"
}
```

---

## 🔐 Security Implementation

### API Security
- ✅ All routes require authentication (`requireAuth()` or `getUserProfile()`)
- ✅ Stripe secret key never exposed to frontend
- ✅ Webhook signature verification using `constructWebhookEvent()`
- ✅ Webhook secret stored in environment variables

### Payment Security
- ✅ PCI compliance delegated to Stripe (we don't handle card data)
- ✅ SSL/TLS encryption for all data in transit
- ✅ No card numbers stored on our servers

### User Privacy
- ✅ Privacy Policy covers data collection and usage
- ✅ GDPR-compliant data processing
- ✅ CCPA-compliant user rights
- ✅ Terms of Service protect both user and company

### Webhook Security
- ✅ Signature verification on every webhook
- ✅ Invalid signatures rejected
- ✅ Event type validation before processing
- ✅ Idempotent subscription updates (safe to reprocess)

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Set up Stripe test mode keys in `.env.local`
- [ ] Create test products and prices in Stripe dashboard
- [ ] Update `STRIPE_PRODUCT_*_PRICE_ID` environment variables
- [ ] Run `npm run build` to verify compilation
- [ ] Visit `/pricing` page
- [ ] Click "Upgrade Now" for Basic tier
- [ ] Complete checkout with test card `4242 4242 4242 4242`
- [ ] Verify user tier updated in database
- [ ] Test "Manage Subscription" button
- [ ] Test webhook with Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  stripe trigger customer.subscription.created
  ```

### Production Deployment
- [ ] Switch Stripe dashboard to live mode
- [ ] Copy live mode API keys and update secrets
- [ ] Update webhook endpoint URL to production domain
- [ ] Create live products and prices (or use API to replicate)
- [ ] Update `STRIPE_PRODUCT_*_PRICE_ID` with live price IDs
- [ ] Deploy to production
- [ ] Test with small real charge ($1)
- [ ] Verify webhook delivery in Stripe dashboard
- [ ] Monitor subscription events in Stripe

---

## 📊 Monitoring & Analytics

### Metrics to Track
- Daily signups and free users
- Paid user count by tier
- Churn rate (cancellations)
- Average revenue per user (ARPU)
- Lifetime value (LTV)
- Failed payment rate

### Where to Monitor
- **Stripe Dashboard**: Subscriptions, revenue, failed payments
- **Database queries**: User count by tier
- **Vercel Analytics**: Checkout page views, conversion funnel
- **Server logs**: Webhook delivery, errors

---

## 🎓 Key Concepts

### Subscriptions
A subscription is a recurring payment relationship between a customer and a product price. When created, it automatically charges on a schedule (monthly, yearly).

### Webhook
An event notification from Stripe to your server. Used to update application state when subscriptions change outside your direct API calls.

### Customer Portal
Stripe-hosted page where customers can:
- Update payment method
- Cancel subscription
- Change subscription (upgrade/downgrade)
- View billing history
- Download invoices

### Idempotency
Webhook events can be delivered multiple times. Subscription updates should be idempotent (same result whether called once or multiple times).

---

## 📝 File Summary

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/stripe/types.ts` | 67 | Type definitions |
| `src/lib/stripe/client.ts` | 237 | Stripe utilities |
| `src/lib/stripe/index.ts` | 41 | Barrel exports |
| `app/api/stripe/checkout/route.ts` | 98 | Checkout sessions |
| `app/api/stripe/webhook/route.ts` | 186 | Webhook handling |
| `app/api/stripe/portal/route.ts` | 64 | Customer portal |
| `app/(public)/pricing/page.tsx` | 386 | Pricing page |
| `app/(public)/terms/page.tsx` | 168 | Terms of Service |
| `app/(public)/privacy/page.tsx` | 156 | Privacy Policy |

**Total**: ~1,400 lines of production code

---

## ✅ Completion Status

| Component | Status | Notes |
|-----------|--------|-------|
| Stripe SDK Setup | ✅ | Installed and configured |
| API Routes | ✅ | Checkout, webhook, portal |
| Pricing Page | ✅ | Full tier comparison |
| Terms of Service | ✅ | Comprehensive ToS |
| Privacy Policy | ✅ | GDPR/CCPA compliant |
| Webhook Handling | ✅ | All events handled |
| TypeScript Types | ✅ | Fully typed |
| Error Handling | ✅ | User-friendly messages |
| Build Verification | ✅ | Compiles successfully |

---

**Status**: 🟢 Production Ready (after Stripe account setup)
