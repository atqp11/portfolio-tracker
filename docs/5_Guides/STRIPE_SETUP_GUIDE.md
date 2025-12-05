# Stripe Setup Guide

Complete step-by-step guide for setting up Stripe payments in Portfolio Tracker.

## 1. Stripe Account Setup

### 1.1 Create a Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Create an account with your business email
3. Complete account verification
4. Confirm your email address

### 1.2 Get Your API Keys

1. Navigate to **Developers** → **API Keys** in the Stripe dashboard
2. You'll see two types of keys:
   - **Publishable Key** (starts with `pk_`) - Safe to use in frontend code
   - **Secret Key** (starts with `sk_`) - NEVER expose this to the frontend

3. Copy both keys for test mode initially

### 1.3 Get Your Webhook Secret

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_`)

## 2. Create Stripe Products and Prices

### 2.1 Create Products

In the Stripe dashboard, go to **Products**:

**Product 1: Basic**
- Name: "Portfolio Tracker - Basic"
- Description: "Advanced AI analysis and unlimited portfolio changes"
- Default price: $6.00 USD
- Billing period: Monthly, recurring

**Product 2: Premium**
- Name: "Portfolio Tracker - Premium"
- Description: "Everything in Basic, plus technical analysis and Monte Carlo simulations"
- Default price: $15.99 USD
- Billing period: Monthly, recurring

### 2.2 Get Price IDs

1. Click on each product
2. Find the **Prices** section
3. Copy the Price ID (starts with `price_`) for each tier

## 3. Environment Variables Configuration

Create or update your `.env.local` file with:

```bash
# Stripe API Keys (from Developers → API Keys)
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_xxx...

# Stripe Webhook Secret (from Developers → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_test_xxx...

# Stripe Price IDs (from Products → Prices)
STRIPE_PRODUCT_FREE_PRICE_ID=price_free_xxx...
STRIPE_PRODUCT_BASIC_PRICE_ID=price_basic_xxx...
STRIPE_PRODUCT_PREMIUM_PRICE_ID=price_premium_xxx...

# Public Stripe key for frontend (same as STRIPE_PUBLISHABLE_KEY but prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
```

### 3.1 For Production

When deploying to production:

1. Go to Stripe dashboard **Settings** → **API Keys**
2. Switch from **Test mode** to **Live mode** (toggle in top-left)
3. Copy the **live** secret and publishable keys
4. Update environment variables:

```bash
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
```

5. Update webhook endpoint in Stripe dashboard to use live webhook URL
6. Copy the **live** webhook signing secret

## 4. Database Schema Updates

Ensure your `profiles` table in Supabase includes:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
```

These columns should already exist if you've run migrations, but verify they're present.

## 5. Testing Stripe Integration Locally

### 5.1 Use Stripe Test Mode

All the keys you copied are in **Test mode** by default. This allows you to:

- Create test subscriptions without charges
- Use test card numbers
- Test webhook functionality

### 5.2 Test Card Numbers

Use these card numbers to test in test mode:

| Purpose | Card Number | Expiry | CVC |
|---------|------------|--------|-----|
| Successful payment | 4242 4242 4242 4242 | Any future date | Any 3 digits |
| Declined card | 4000 0000 0000 0002 | Any future date | Any 3 digits |
| Requires authentication | 4000 0025 0000 3155 | Any future date | Any 3 digits |

### 5.3 Testing Webhooks Locally

To test webhooks on your local machine:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Copy the webhook signing secret shown
4. Add to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

5. Trigger events:

```bash
stripe trigger customer.subscription.created
```

## 6. API Route Implementation

### 6.1 Checkout Route: `/api/stripe/checkout`

**POST** - Create checkout session
```typescript
// Request
POST /api/stripe/checkout
{
  "tier": "basic",
  "successUrl": "https://example.com/pricing?success=true",
  "cancelUrl": "https://example.com/pricing?canceled=true"
}

// Response
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxx",
  "tier": "basic"
}
```

### 6.2 Webhook Route: `/api/stripe/webhook`

**POST** - Receives Stripe events

Events handled:
- `customer.subscription.created` - User upgraded
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - User downgraded/canceled
- `invoice.payment_succeeded` - Payment completed
- `invoice.payment_failed` - Payment failed

### 6.3 Portal Route: `/api/stripe/portal`

**POST** - Create customer portal session
```typescript
// Request
POST /api/stripe/portal
{
  "returnUrl": "https://example.com/dashboard"
}

// Response
{
  "url": "https://billing.stripe.com/..."
}
```

## 7. Pricing Page Integration

The pricing page (`/pricing`) already includes:

- Tier comparison (Free, Basic, Premium)
- Feature matrix by tier
- Checkout buttons
- Manage subscription link (for current subscribers)
- FAQ section

Users can:
1. View pricing and features
2. Click "Upgrade Now" for paid tiers
3. Be redirected to Stripe checkout
4. Manage their subscription through the customer portal

## 8. Workflow: User Subscribes

1. User clicks "Upgrade" on pricing page
2. Redirected to Stripe checkout session
3. Fills in payment information
4. Confirms subscription
5. Redirected to success page
6. Webhook event `customer.subscription.created` received
7. User tier updated in database to "basic" or "premium"
8. User has access to paid features immediately

## 9. Workflow: User Downgrades

1. User clicks "Manage Subscription"
2. Opens Stripe customer portal
3. Clicks "Cancel" or switches to lower tier
4. Webhook event `customer.subscription.deleted` or `customer.subscription.updated` received
5. User tier downgraded or removed
6. Access to premium features removed (gracefully)

## 10. Workflow: Webhook Event

1. Stripe sends event to webhook endpoint
2. Signature verified using webhook secret
3. Event type checked (subscription created/updated/deleted)
4. User tier updated in database
5. Relevant flags set (e.g., `subscription_status`)
6. Response sent (HTTP 200)

## 11. Troubleshooting

### Webhook events not being received

1. Check webhook URL is accessible
2. Verify webhook secret in environment
3. Check Stripe dashboard for failed delivery attempts
4. Use Stripe CLI to test locally: `stripe trigger customer.subscription.created`

### Payment errors

1. Check card is in test mode numbers (if testing)
2. Verify price IDs are correct
3. Check Stripe dashboard for error details
4. Look at server logs for error messages

### User tier not updating

1. Verify webhook secret is correct
2. Check webhook handler is receiving events
3. Verify database connection
4. Check user ID is being passed in metadata
5. Verify price ID mapping in `getTierFromPriceId()`

### Test vs. Production mode confusion

- **Test mode**: No real charges, test cards only, for development
- **Live mode**: Real charges, real cards, for production
- Switch in Stripe dashboard top-left corner
- Update API keys when switching modes
- Never commit live keys to version control

## 12. Security Best Practices

✅ **Do:**
- Keep `STRIPE_SECRET_KEY` in environment variables only
- Verify webhook signatures
- Use HTTPS for webhook endpoint
- Sanitize user inputs
- Store customer ID in database
- Validate tier changes
- Log all subscription events
- Monitor failed payments

❌ **Don't:**
- Expose `STRIPE_SECRET_KEY` in frontend code
- Log sensitive payment data
- Trust client-side tier information
- Skip webhook signature verification
- Store full card numbers
- Commit `.env.local` to version control

## 13. Next Steps

1. Create Stripe account and get API keys
2. Create products and prices in Stripe dashboard
3. Add environment variables to `.env.local`
4. Test checkout flow locally with test cards
5. Test webhook handling with Stripe CLI
6. Deploy to production
7. Update Stripe webhook URL for production domain
8. Switch to live keys in Stripe dashboard
9. Test end-to-end with real payment (consider using a small amount)
10. Monitor subscription events in Stripe dashboard

## 14. Useful Links

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Documentation:** https://stripe.com/docs
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Test Card Numbers:** https://stripe.com/docs/testing
- **Webhook Events:** https://stripe.com/docs/api/events
- **Stripe Node.js Reference:** https://stripe.com/docs/api/node

## 15. Support

For Stripe integration issues:
- Check Stripe dashboard logs
- Review error messages in server logs
- Test with Stripe CLI locally
- Contact Stripe support: support@stripe.com

For Portfolio Tracker integration issues:
- Check webhook handler at `/app/api/stripe/webhook/route.ts`
- Verify database schema matches expectations
- Check environment variables are set
- Review server logs for errors
