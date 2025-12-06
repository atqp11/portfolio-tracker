#!/usr/bin/env node
// Prebuild check: ensure required server Stripe price env vars are set.
const required = [
  'STRIPE_PRICE_FREE_MONTHLY',
  'STRIPE_PRICE_FREE_ANNUAL',
  'STRIPE_PRICE_BASIC_MONTHLY',
  'STRIPE_PRICE_BASIC_ANNUAL',
  'STRIPE_PRICE_PREMIUM_MONTHLY',
  'STRIPE_PRICE_PREMIUM_ANNUAL',
];

const missing = required.filter((k) => !process.env[k] || process.env[k].trim() === '');

if (missing.length) {
  console.error('\nERROR: Missing required Stripe price env vars:');
  missing.forEach((k) => console.error('  -', k));
  console.error('\nSet them in Vercel Project > Settings > Environment Variables (Build & Production), then retry.');
  process.exit(1);
}

console.log('Stripe price env check passed.');
