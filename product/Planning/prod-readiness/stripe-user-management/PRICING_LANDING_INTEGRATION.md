# Pricing & Landing Page Integration

**Status:** 📋 Planning  
**Created:** December 5, 2025  
**Priority:** 🔴 High (User Acquisition Flow)

---

## Overview

This document outlines the integration plan for connecting the pricing page to Stripe checkout and integrating pricing into the landing page for a complete marketing → signup → payment flow.

---

## Current State

### Existing Pages

| Page | URL | Status |
|------|-----|--------|
| Landing Page | `/landing` | ✅ Exists (basic) |
| Pricing Page | `/pricing` | ✅ Exists (basic) |
| Checkout API | `/api/stripe/checkout` | ✅ Working |
| Portal API | `/api/stripe/portal` | ✅ Working |

---

## Target User Journey

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

---

## Pricing Page Implementation

### 1. Pricing Tiers Configuration

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
      monthly: 6,
      annual: 60, // 2 months free
    },
    priceId: {
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
      annual: 159, // ~2 months free
    },
    priceId: {
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

### 2. Pricing Page Component

**File:** `app/(public)/pricing/page.tsx`

```tsx
import { Metadata } from 'next';
import PricingContent from './pricing-content';

export const metadata: Metadata = {
  title: 'Pricing - Portfolio Tracker',
  description: 'Choose the plan that fits your investment journey',
};

export default function PricingPage() {
  return <PricingContent />;
}
```

**File:** `app/(public)/pricing/pricing-content.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRICING_TIERS } from '@/src/lib/pricing/tiers';
import { useAuth } from '@/components/auth/AuthProvider';
import { PricingCard } from '@/components/pricing/PricingCard';
import { BillingToggle } from '@/components/pricing/BillingToggle';

export default function PricingContent() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const handleSelectPlan = async (tierId: string) => {
    setLoading(tierId);

    try {
      // Free tier - just sign up
      if (tierId === 'free') {
        if (user) {
          router.push('/dashboard');
        } else {
          router.push('/auth/sign-up');
        }
        return;
      }

      // Paid tiers - need authentication first
      if (!user) {
        // Store selected tier in session storage for post-auth redirect
        sessionStorage.setItem('selectedPlan', JSON.stringify({
          tier: tierId,
          billing: billingPeriod,
        }));
        router.push('/auth/sign-up?redirect=checkout');
        return;
      }

      // Already authenticated - go to checkout
      const tier = PRICING_TIERS.find(t => t.id === tierId);
      const priceId = tier?.priceId[billingPeriod];

      if (!priceId) {
        throw new Error('Price ID not configured');
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierId,
          priceId,
          successUrl: `${window.location.origin}/dashboard?upgraded=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
          trialDays: tier?.trialDays,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      // Show error toast
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your investment journey. 
            All paid plans include a 14-day free trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <BillingToggle
            value={billingPeriod}
            onChange={setBillingPeriod}
          />
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              billingPeriod={billingPeriod}
              loading={loading === tier.id}
              onSelect={() => handleSelectPlan(tier.id)}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          {/* FAQ items */}
        </div>
      </div>
    </div>
  );
}
```

### 3. Pricing Card Component

**File:** `components/pricing/PricingCard.tsx`

```tsx
'use client';

import { PricingTier } from '@/src/lib/pricing/tiers';
import { Check, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PricingCardProps {
  tier: PricingTier;
  billingPeriod: 'monthly' | 'annual';
  loading?: boolean;
  onSelect: () => void;
}

export function PricingCard({
  tier,
  billingPeriod,
  loading,
  onSelect,
}: PricingCardProps) {
  const price = tier.price[billingPeriod];
  const monthlyEquivalent = billingPeriod === 'annual' 
    ? (price / 12).toFixed(2) 
    : price;

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-gray-900 border p-8',
        tier.popular
          ? 'border-indigo-500 ring-2 ring-indigo-500'
          : 'border-gray-800'
      )}
    >
      {/* Popular Badge */}
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
        <p className="text-gray-400 text-sm">{tier.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-8">
        <div className="flex items-baseline justify-center">
          <span className="text-5xl font-bold text-white">
            ${price === 0 ? '0' : monthlyEquivalent}
          </span>
          <span className="text-gray-400 ml-2">/month</span>
        </div>
        {billingPeriod === 'annual' && price > 0 && (
          <p className="text-sm text-gray-400 mt-2">
            Billed ${price}/year (save 17%)
          </p>
        )}
        {tier.trialDays && (
          <p className="text-sm text-indigo-400 mt-2">
            {tier.trialDays}-day free trial included
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={loading}
        className={cn(
          'w-full py-3 px-6 rounded-lg font-semibold transition-all',
          tier.cta.variant === 'outline' && 'border border-gray-700 text-white hover:bg-gray-800',
          tier.cta.variant === 'default' && 'bg-indigo-600 text-white hover:bg-indigo-700',
          tier.cta.variant === 'premium' && 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? 'Processing...' : tier.cta.text}
      </button>

      {/* Features */}
      <div className="mt-8 space-y-4">
        {tier.features.map((feature) => (
          <div key={feature} className="flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-gray-300 text-sm">{feature}</span>
          </div>
        ))}
        {tier.limitations.map((limitation) => (
          <div key={limitation} className="flex items-start">
            <X className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-gray-500 text-sm">{limitation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Landing Page Integration

### 1. Add Pricing Section to Landing Page

**File:** `components/LandingPage.tsx` (Add section)

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

### 2. Update Hero CTA

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

### 3. Navigation Updates

**File:** `components/Navigation.tsx`

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

---

## Post-Auth Checkout Flow

### Handle Redirect After Authentication

**File:** `app/auth/callback/route.ts` (Update)

```typescript
// After successful authentication, check for pending checkout

export async function GET(request: NextRequest) {
  // ... existing auth callback logic ...

  // Check for pending checkout
  const redirectUrl = new URL(request.url);
  const redirect = redirectUrl.searchParams.get('redirect');

  if (redirect === 'checkout') {
    // User was trying to checkout before auth
    // The pricing page will handle the checkout via sessionStorage
    return NextResponse.redirect(new URL('/pricing?resume=checkout', request.url));
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

**File:** `app/(public)/pricing/pricing-content.tsx` (Add effect)

```tsx
useEffect(() => {
  // Resume checkout if redirected from auth
  const params = new URLSearchParams(window.location.search);
  if (params.get('resume') === 'checkout' && user) {
    const savedPlan = sessionStorage.getItem('selectedPlan');
    if (savedPlan) {
      const { tier, billing } = JSON.parse(savedPlan);
      sessionStorage.removeItem('selectedPlan');
      setBillingPeriod(billing);
      handleSelectPlan(tier);
    }
  }
}, [user]);
```

---

## Environment Variables

```env
# Stripe Public Keys (for pricing page)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Price IDs (public for client-side)
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL=price_xxx
```

Notes & Server-side mapping

 - Canonical server-side env names (recommended):
   - `STRIPE_PRICE_BASIC_MONTHLY`, `STRIPE_PRICE_BASIC_ANNUAL`
   - `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_ANNUAL`
 - Legacy/alternate env names supported by server code:
   - `STRIPE_PRODUCT_BASIC_PRICE_ID`, `STRIPE_PRODUCT_PREMIUM_PRICE_ID` (older naming)
 - If you expose price IDs to the client, set the `NEXT_PUBLIC_...` variants as shown above.
 - The application will attempt to resolve price IDs in this order:
   1. `STRIPE_PRODUCT_{TIER}_PRICE_ID` (legacy)
   2. `STRIPE_PRICE_{TIER}_{BILLING}` (server canonical)
   3. `NEXT_PUBLIC_STRIPE_PRICE_{TIER}_{BILLING}` (client-exposed)

Recommendation

 - Set both server and client env vars during deployment to avoid surprises.
 - For example, in Vercel set `STRIPE_PRICE_PREMIUM_MONTHLY` and also `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY` if you need the price ID client-side.

---

## File Structure

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
├── page.tsx              # Pricing page
└── pricing-content.tsx   # Client component
```

---

## Success Criteria

- [ ] Landing page has pricing section with CTAs
- [ ] Pricing page shows all tiers with correct prices
- [ ] Monthly/Annual toggle updates prices
- [ ] Free tier → Sign up page
- [ ] Paid tiers (unauthenticated) → Sign up → Checkout
- [ ] Paid tiers (authenticated) → Direct to Stripe Checkout
- [ ] Successful payment → Dashboard with upgraded tier
- [ ] Failed/canceled payment → Back to pricing with message

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Pricing Config | 0.5 day | Tier configuration |
| Pricing Page | 1 day | Full pricing page with toggle |
| Landing Integration | 0.5 day | Pricing section on landing |
| Auth Flow | 1 day | Post-auth checkout redirect |
| Testing | 1 day | E2E tests for full flow |

**Total: ~4 days**
