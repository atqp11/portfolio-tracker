import { Metadata } from 'next';
import { getUser } from '@lib/auth/session';
import PricingContentClient from './pricing-content-client';

export const metadata: Metadata = {
  title: 'Pricing - Portfolio Tracker',
  description: 'Choose the plan that fits your investment journey',
};

export default async function PricingPage() {
  // Check authentication status (non-blocking for public page)
  // Wrapped in try-catch to prevent Supabase source map warnings
  let isAuthenticated = false;
  
  try {
    const user = await getUser();
    isAuthenticated = !!user;
  } catch (error) {
    // Silent fail for public page - assume not authenticated
    // Source map warnings from Supabase auth-js are logged but non-critical
    isAuthenticated = false;
  }

  return <PricingContentClient isAuthenticated={isAuthenticated} />;
}