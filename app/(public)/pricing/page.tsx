import { Metadata } from 'next';
import PricingContent from './pricing-content';

export const metadata: Metadata = {
  title: 'Pricing - Portfolio Tracker',
  description: 'Choose the plan that fits your investment journey',
};

export default function PricingPage() {
  return <PricingContent />;
}