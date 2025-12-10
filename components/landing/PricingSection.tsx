"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllPlanMetadata } from '@/src/backend/modules/subscriptions/config/plans.config';
import { PricingCard } from '@/components/pricing/PricingCard';
import { BillingToggle } from '@/components/pricing/BillingToggle';

const PRICING_TIERS = getAllPlanMetadata();

const PricingSection = () => {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

    return (
        <section id="pricing" className="py-24 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                        Start Free, Upgrade When Ready
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Begin with our free plan. Upgrade anytime to unlock advanced features. All paid plans include a 14-day free trial.
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-12">
                    <BillingToggle
                        value={billingPeriod}
                        onChange={setBillingPeriod}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {PRICING_TIERS.map((tier) => (
                        <PricingCard
                            key={tier.id}
                            tier={tier}
                            billingPeriod={billingPeriod}
                            onSelect={() => {
                                // Navigate to pricing page with selected billing period
                                window.location.href = `/pricing?tier=${tier.id}&billing=${billingPeriod}`;
                            }}
                        />
                    ))}
                </div>

                <div className="text-center mt-12 space-y-4">
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                        View full pricing details & annual plans
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                    <p className="text-sm text-gray-500">
                        Questions? Check out our{' '}
                        <Link href="/pricing#faq" className="text-indigo-400 hover:text-indigo-300">
                            FAQ
                        </Link>{' '}
                        or contact support
                    </p>
                </div>
            </div>
        </section>
    );
};

export default PricingSection;