'use client';

import { useState, useEffect } from 'react';
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