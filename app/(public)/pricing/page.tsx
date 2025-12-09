import { Metadata } from 'next';
import { getUser } from '@lib/auth/session';
import PricingContentClient from './pricing-content-client';

export const metadata: Metadata = {
  title: 'Pricing - Portfolio Tracker',
  description: 'Choose the plan that fits your investment journey',
};

export default async function PricingPage() {
  // Check authentication status (non-blocking for public page)
  const user = await getUser();
  const isAuthenticated = !!user;

  return <PricingContentClient isAuthenticated={isAuthenticated} />;
}