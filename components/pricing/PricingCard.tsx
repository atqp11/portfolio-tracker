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
