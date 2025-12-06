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

export function resolvePriceId(tier: 'free' | 'basic' | 'premium', billing: 'monthly' | 'annual'): string {
  const envVarName = `STRIPE_PRICE_${tier.toUpperCase()}_${billing.toUpperCase()}`;
  return process.env[envVarName] || '';
}
