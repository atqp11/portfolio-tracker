'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader, AlertCircle, Zap, Shield, Star, Check, Sparkles, ArrowRight, CreditCard } from 'lucide-react';
import { TIER_CONFIG, type TierName } from '@/src/lib/tiers';

// --- CSS for High-End Visuals & 3D Effects (Ported from LandingPage) ---
const styles = `
  /* Aurora & Blob Animations - SLOWED DOWN */
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(40px, -60px) scale(1.15); }
    66% { transform: translate(-30px, 30px) scale(0.95); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 15s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  
  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  }
  .glass-card-hover {
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .glass-card-hover:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-8px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }

  /* Liquid Button */
  .btn-liquid {
    background: rgba(99, 102, 241, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  .btn-liquid:hover {
    background: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
    transform: translateY(-2px);
  }
  
  .text-gradient {
    background: linear-gradient(to right, #fff, #a5b4fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .text-gradient-primary {
    background: linear-gradient(to right, #818cf8, #c084fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

interface UserInfo {
  tier: TierName;
  email: string;
}

const FEATURE_LABELS: Record<string, string> = {
  portfolioTracking: 'Portfolio Tracking',
  dailyChecklist: 'Daily Checklist',
  basicRiskMetrics: 'Basic Risk Metrics',
  stockPrices: 'Real-time Stock Prices',
  advancedAI: 'Advanced AI Analysis',
  advancedRiskMetrics: 'Advanced Risk Analysis',
  interactiveCharts: 'Interactive Charts',
  thesisHealthScoring: 'Thesis Health Scoring',
  emailSupport: 'Email Support',
  technicalAnalysis: 'Technical Analysis',
  monteCarloSimulations: 'Monte Carlo Simulations',
  smartAlerts: 'Smart Alerts',
  advancedScenarios: 'Advanced Scenarios',
  stressTesting: 'Stress Testing',
  apiAccess: 'API Access',
  prioritySupport: '24/7 Priority Support',
  customReports: 'Custom Reports',
};

export default function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<TierName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requiredTier = (searchParams.get('required') as TierName) || null;

  useEffect(() => {
    // Fetch current user info
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/stripe/checkout');
        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleCheckout = async (tier: TierName) => {
    if (!userInfo) return;

    try {
      setCheckoutLoading(tier);
      setError(null);

      if (tier === 'free') {
        // Downgrade to free (no checkout needed, just API call)
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: 'free' }),
        });

        if (res.ok) {
          // Refresh user info
          const updatedRes = await fetch('/api/stripe/checkout');
          if (updatedRes.ok) {
            const data = await updatedRes.json();
            setUserInfo(data);
          }
          setError(null);
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Downgrade failed');
        }
        return;
      }

      const origin = window.location.origin;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          successUrl: `${origin}/pricing?success=true`,
          cancelUrl: `${origin}/pricing?canceled=true`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Checkout failed');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!userInfo) return;

    try {
      setLoading(true);
      const origin = window.location.origin;
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${origin}/pricing`,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentTier = (tier: TierName) => userInfo?.tier === tier;

  if (!userInfo && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      <style>{styles}</style>

      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-200">Upgrade your investing journey</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-gradient">Simple pricing, </span>
            <br className="hidden md:block" />
            <span className="text-gradient-primary">powerful results.</span>
          </h1>
          
          <p className="text-xl text-gray-400 leading-relaxed">
            Choose the plan that fits your investment style. 
            <br />
            Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-200 max-w-2xl mx-auto backdrop-blur-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {searchParams.get('success') && (
          <div className="mb-8 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-200 max-w-2xl mx-auto backdrop-blur-md">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>Subscription updated successfully! Thank you for your support.</p>
          </div>
        )}

        {requiredTier && (
          <div className="mb-8 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 text-blue-200 max-w-2xl mx-auto backdrop-blur-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>This feature requires at least the <strong>{requiredTier}</strong> tier.</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-start mb-24">
          {Object.entries(TIER_CONFIG).map(([key, tier]) => {
            const isPopular = key === 'pro';
            const tierKey = key as TierName;
            const isCurrent = isCurrentTier(tierKey);
            const isLoading = checkoutLoading === tierKey;

            return (
              <div
                key={key}
                className={`
                  relative rounded-3xl p-8 glass-panel glass-card-hover flex flex-col h-full
                  ${isPopular ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-white/10'}
                  ${isCurrent ? 'ring-2 ring-green-500/50' : ''}
                `}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold text-white shadow-lg shadow-indigo-500/25">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {isCurrent && <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/30">Current</span>}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-gray-400 mt-4 text-sm leading-relaxed min-h-[40px]">
                    {key === 'free' && "Essential tools for the casual investor."}
                    {key === 'basic' && "Advanced metrics and AI for serious growth."}
                    {key === 'premium' && "Professional-grade tools for maximum alpha."}
                  </p>
                </div>

                <div className="flex-grow space-y-4 mb-8">
                  {Object.entries(tier.features).map(([featureKey, value]) => {
                    if (!value) return null;
                    const label = FEATURE_LABELS[featureKey] || featureKey;
                    return (
                      <div key={featureKey} className="flex items-start gap-3 group">
                        <div className={`mt-1 p-0.5 rounded-full ${isPopular ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-800 text-gray-400'} group-hover:text-white transition-colors`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          {label}
                          {typeof value === 'number' && value > 1 && ` (${value})`}
                          {typeof value === 'string' && ` (${value})`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleCheckout(tierKey)}
                  disabled={loading || checkoutLoading !== null || isCurrent}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-300
                    flex items-center justify-center gap-2
                    ${isCurrent 
                      ? 'bg-white/5 text-gray-400 cursor-default border border-white/10' 
                      : isPopular
                        ? 'btn-liquid text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20'
                    }
                    ${(loading || checkoutLoading !== null) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      {key === 'free' ? 'Get Started' : 'Upgrade Now'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Manage Subscription Section */}
        {userInfo && userInfo.tier !== 'free' && (
          <div className="max-w-2xl mx-auto mb-24">
            <div className="glass-panel rounded-2xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-4">Manage Your Subscription</h3>
                <p className="text-gray-400 mb-8">
                  Need to update your payment method, view invoices, or change your plan?
                  Access your secure billing portal below.
                </p>
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-semibold text-white transition-all hover:scale-105"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Open Billing Portal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gradient">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "Can I change my plan later?", a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle." },
              { q: "Do you offer refunds?", a: "We offer a 7-day money-back guarantee. If you're not satisfied, contact support for a refund." },
              { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe. All payments are secure and encrypted." },
              { q: "Can I cancel anytime?", a: "Yes, cancel anytime with no penalties. You'll retain access through your billing period." }
            ].map((faq, i) => (
              <div key={i} className="glass-panel rounded-xl p-6 hover:bg-white/5 transition-colors">
                <h3 className="font-semibold text-white mb-2 text-lg">{faq.q}</h3>
                <p className="text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-24 text-center border-t border-white/10 pt-12">
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-indigo-400 transition-colors">Back to Home</Link>
            <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link>
          </div>
          <p className="mt-4 text-xs text-gray-600">
            Secure payments powered by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
