# Stripe Integration - Setup Checklist

Complete walkthrough for setting up Stripe payments in Portfolio Tracker.

## Phase 1: Stripe Account Setup (5 minutes)

- [ ] Go to https://dashboard.stripe.com/register
- [ ] Create Stripe account with business email
- [ ] Complete email verification
- [ ] Complete account information (business details)
- [ ] Verify phone number

## Phase 2: Get API Keys (5 minutes)

1. **Go to Developers → API Keys**
   - [ ] Switch to **Test Mode** (top left corner)
   - [ ] Copy **Publishable Key** (starts with `pk_test_`)
   - [ ] Copy **Secret Key** (starts with `sk_test_`)
   
2. **Store in environment variables**
   ```bash
   STRIPE_SECRET_KEY=pk_test_xxx...
   STRIPE_PUBLISHABLE_KEY=sk_test_xxx...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
   ```

## Phase 3: Create Products and Prices (10 minutes)

### Product 1: Basic Tier

1. Go to **Products** → **Create product**
2. Fill in:
   - **Name**: Portfolio Tracker - Basic
   - **Description**: Advanced AI analysis and unlimited portfolio changes
   - **Type**: Recurring (select this option)
3. Click **Add pricing model**
4. Enter:
   - **Price**: 6.00 USD
   - **Billing period**: Monthly
   - **Recurring payment**: On
5. Click **Create product**
6. **Copy the Price ID** (looks like `price_1Ox...`) → Set as `STRIPE_PRODUCT_BASIC_PRICE_ID`

### Product 2: Premium Tier

1. Go to **Products** → **Create product**
2. Fill in:
   - **Name**: Portfolio Tracker - Premium
   - **Description**: Everything in Basic, plus technical analysis and Monte Carlo simulations
   - **Type**: Recurring (select this option)
3. Click **Add pricing model**
4. Enter:
   - **Price**: 15.99 USD
   - **Billing period**: Monthly
   - **Recurring payment**: On
5. Click **Create product**
6. **Copy the Price ID** → Set as `STRIPE_PRODUCT_PREMIUM_PRICE_ID`

### Product 3: Free Tier (Optional)

1. You can optionally create a free product
2. Set **Price**: 0.00 USD
3. Copy Price ID → Set as `STRIPE_PRODUCT_FREE_PRICE_ID`

## Phase 4: Create Webhook Endpoint (10 minutes)

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter **Endpoint URL**: 
   ```
   For local testing: http://localhost:3000/api/stripe/webhook
   For production: https://yourdomain.com/api/stripe/webhook
   ```
4. Click **Select events**
5. Search for and select these events:
   - [ ] `customer.subscription.created`
   - [ ] `customer.subscription.updated`
   - [ ] `customer.subscription.deleted`
   - [ ] `invoice.payment_succeeded`
   - [ ] `invoice.payment_failed`
6. Click **Add endpoint**
7. Click on the newly created endpoint
8. **Copy the Signing secret** (starts with `whsec_`) → Set as `STRIPE_WEBHOOK_SECRET`

## Phase 5: Update Environment Variables (5 minutes)

Add to `.env.local`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx...

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_test_xxx...

# Stripe Price IDs
STRIPE_PRODUCT_FREE_PRICE_ID=price_xxx... (optional)
STRIPE_PRODUCT_BASIC_PRICE_ID=price_xxx...
STRIPE_PRODUCT_PREMIUM_PRICE_ID=price_xxx...
```

## Phase 6: Test Locally (10 minutes)

1. **Install Stripe CLI**
   ```bash
   # Windows
   choco install stripe-cli
   
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Authenticate CLI**
   ```bash
   stripe login
   ```

3. **Forward webhooks locally**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   - Copy the webhook signing secret shown
   - Update `STRIPE_WEBHOOK_SECRET` in `.env.local` with this value

4. **Start your app**
   ```bash
   npm run dev
   ```

5. **Test checkout flow**
   - Visit http://localhost:3000/pricing
   - Click "Upgrade to Basic"
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/26)
   - CVC: Any 3 digits
   - Postal code: Any 5 digits
   - Click "Subscribe"

6. **Verify in another terminal**
   ```bash
   # Trigger a test webhook event
   stripe trigger customer.subscription.created
   ```

7. **Check database**
   - Verify user tier updated to "basic"
   - Check subscription_id stored
   - Check stripe_customer_id stored

## Phase 7: Test with Stripe Dashboard

- [ ] Go to **Customers** in Stripe dashboard
- [ ] Find your test customer
- [ ] Click to view details
- [ ] Verify subscription shows "active"
- [ ] Verify price is correct

## Phase 8: Production Deployment (15 minutes)

### Before Going Live

1. **Switch to Live Mode**
   - [ ] Go to **Developers** → **API Keys**
   - [ ] Toggle to **Live Mode** (top left)
   - [ ] Copy **Live Secret Key** (starts with `sk_live_`)
   - [ ] Copy **Live Publishable Key** (starts with `pk_live_`)

2. **Create Live Products** (if not using test mode products)
   - [ ] Repeat Phase 3 steps with Live Mode enabled
   - [ ] Copy new Price IDs for live products

3. **Create Live Webhook**
   - [ ] Go to **Developers** → **Webhooks**
   - [ ] Add new endpoint with **Production URL**:
     ```
     https://yourdomain.com/api/stripe/webhook
     ```
   - [ ] Select same events as test mode
   - [ ] Copy webhook signing secret

4. **Update Production Secrets**
   ```bash
   # In your hosting provider (Vercel, etc.)
   STRIPE_SECRET_KEY=sk_live_xxx...
   STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
   STRIPE_WEBHOOK_SECRET=whsec_live_xxx...
   STRIPE_PRODUCT_BASIC_PRICE_ID=price_live_xxx...
   STRIPE_PRODUCT_PREMIUM_PRICE_ID=price_live_xxx...
   ```

5. **Deploy Application**
   - [ ] Commit code changes
   - [ ] Push to production branch
   - [ ] Verify deployment succeeds

6. **Test Live with Small Charge**
   - [ ] Visit https://yourdomain.com/pricing
   - [ ] Try upgrading with your own card (will charge $1)
   - [ ] Verify charge appears in Stripe dashboard
   - [ ] Verify webhook was received in Stripe Webhooks → Logs

### Post-Launch Monitoring

- [ ] **Monitor Stripe dashboard** for:
  - [ ] Successful payments
  - [ ] Failed payments (check logs)
  - [ ] Subscription events
  - [ ] Customer complaints

- [ ] **Check Application Logs** for:
  - [ ] Webhook errors
  - [ ] Failed database updates
  - [ ] API rate limits

- [ ] **First Week Tasks**:
  - [ ] Monitor for any failed webhooks
  - [ ] Check database for correct tier updates
  - [ ] Verify email notifications working (if implemented)
  - [ ] Monitor customer support for billing issues

## Phase 9: Add Payment Features (Optional)

### Email Notifications
Create email on subscription events:
- Welcome email when subscribed
- Renewal reminder before billing date
- Failed payment notification
- Cancellation confirmation

### Admin Dashboard
- View all subscriptions
- Manual tier changes
- Refund management
- Customer communication

### Customer Self-Service
- Change payment method
- Update billing address
- Download invoices
- View usage metrics

## Test Card Numbers

Use these in test mode (do NOT use in production):

| Purpose | Card Number | Expiry | CVC |
|---------|------------|--------|-----|
| Successful | 4242 4242 4242 4242 | Any future | Any 3 digits |
| Decline | 4000 0000 0000 0002 | Any future | Any 3 digits |
| 3D Secure | 4000 0025 0000 3155 | Any future | Any 3 digits |
| Expired | 4000 0000 0000 0069 | 12/20 | Any 3 digits |

## Troubleshooting

### "Price not found"
- Verify Price ID is correct (copy from Stripe dashboard)
- Ensure it's the right mode (test vs live)
- Check environment variable is set

### "Webhook not received"
- Verify endpoint URL is correct
- Check Stripe CLI is running: `stripe listen --forward-to localhost:3000/...`
- Check firewall isn't blocking webhooks
- Check server logs for errors

### "User tier not updating"
- Check webhook signature verification passed
- Verify user ID is in metadata
- Check database connection
- Look at application logs

### "Charge succeeded but tier not updated"
- Check webhook was delivered in Stripe dashboard
- Check application webhook handler is running
- Check user ID lookup in database
- Verify `updateUserTier()` function works

## Quick Reference: URLs

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Events**: https://stripe.com/docs/api/events
- **API Reference**: https://stripe.com/docs/api

## Next Steps After Setup

1. ✅ Test basic checkout flow
2. ✅ Test webhook delivery
3. ✅ Deploy to production
4. ✅ Monitor first subscriptions
5. ⬜ Add email notifications (optional)
6. ⬜ Create admin dashboard (optional)
7. ⬜ Implement trial periods (optional)
8. ⬜ Add usage-based billing (future)

---

**Total Setup Time**: ~60 minutes (including testing)
**Difficulty**: Intermediate
**Support**: See Stripe documentation or support@stripe.com
