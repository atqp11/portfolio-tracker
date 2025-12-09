'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRICING_TIERS } from '@/src/lib/pricing/tiers';
import { PricingCard } from '@/components/pricing/PricingCard';
import { BillingToggle } from '@/components/pricing/BillingToggle';
import { createCheckoutSession } from './actions';

interface PricingContentClientProps {
  isAuthenticated: boolean;
}

export default function PricingContentClient({ isAuthenticated }: PricingContentClientProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelectPlan = async (tierId: string) => {
    setLoading(tierId);

    try {
      // Free tier - just sign up
      if (tierId === 'free') {
        if (isAuthenticated) {
          router.push('/dashboard');
        } else {
          router.push('/auth/signup');
        }
        return;
      }

      // Paid tiers - need authentication first
      if (!isAuthenticated) {
        // Store selected tier in session storage for post-auth redirect
        sessionStorage.setItem('selectedPlan', JSON.stringify({
          tier: tierId,
          billing: billingPeriod,
        }));
        router.push('/auth/signup?redirect=checkout');
        return;
      }

      // Already authenticated - use server action
      const tier = PRICING_TIERS.find(t => t.id === tierId);

      if (!tier) {
        throw new Error('Tier not found');
      }

      startTransition(async () => {
        try {
          // Pass billingPeriod instead of priceId - server will resolve it
          const result = await createCheckoutSession({
            tier: tierId,
            billingPeriod, // Server will resolve priceId from this
            successUrl: `${window.location.origin}/dashboard?upgraded=true`,
            cancelUrl: `${window.location.origin}/pricing?canceled=true`,
            trialDays: tier?.trialDays,
          });

          if (result.success && result.url) {
            window.location.href = result.url;
          } else {
            throw new Error('Failed to create checkout session');
          }
        } catch (error) {
          console.error('Checkout error:', error);
          alert(error instanceof Error ? error.message : 'Failed to create checkout session');
          setLoading(null);
        }
      });
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create checkout session');
      setLoading(null);
    }
  };

  useEffect(() => {
    // Resume checkout if redirected from auth
    const resume = searchParams.get('resume');
    if (resume === 'checkout' && isAuthenticated) {
      const savedPlan = sessionStorage.getItem('selectedPlan');
      if (savedPlan) {
        const { tier, billing } = JSON.parse(savedPlan);
        sessionStorage.removeItem('selectedPlan');
        setBillingPeriod(billing);
        handleSelectPlan(tier);
      }
    }

    // Handle checkout cancellation - clear any saved plan and ensure user stays on free tier
    const canceled = searchParams.get('canceled');
    if (canceled === 'true') {
      // Clear any saved plan from sessionStorage
      sessionStorage.removeItem('selectedPlan');
      // User remains on free tier (database trigger sets it, and no webhook fired)
      // Optionally show a message to the user
    }
  }, [isAuthenticated, searchParams]);

  const isLoading = loading !== null || isPending;

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
              loading={isLoading && loading === tier.id}
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

