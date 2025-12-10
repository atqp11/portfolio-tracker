'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAllPlanMetadata } from '@/src/backend/modules/subscriptions/config/plans.config';
import { PricingCard } from '@/components/pricing/PricingCard';
import { BillingToggle } from '@/components/pricing/BillingToggle';
import { createCheckoutSession } from './actions';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

const PRICING_TIERS = getAllPlanMetadata();

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
    <div className="min-h-screen bg-gray-950">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/70 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/10">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              StockBuddy
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/#pricing" className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Back to Home
            </Link>
            <Link href="/auth/signin" className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-50 transition-colors border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-20 pt-28">
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
    </div>
  );
}


