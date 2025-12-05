/**
 * Stripe Integration Types
 * 
 * Defines types for Stripe products, prices, and subscription management
 */

export type StripeTier = 'free' | 'basic' | 'premium';

export interface StripeProduct {
  id: string;
  tier: StripeTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface StripePrice {
  id: string;
  productId: string;
  tier: StripeTier;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  priceId: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
    previous_attributes?: Record<string, any>;
  };
}

export interface CheckoutSessionCreateRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}

export interface CheckoutSessionCreateResponse {
  sessionId: string;
  url: string | null;
}
