/**
 * Pricing Page
 * 
 * Displays tier comparison and checkout options
 */

'use client';

import { Suspense } from 'react';
import PricingContent from './pricing-content';

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <PricingContent />
    </Suspense>
  );
}
