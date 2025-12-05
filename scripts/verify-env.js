#!/usr/bin/env node
/**
 * Simple environment verification script for Phase 4 pre-deployment checks.
 * - Checks required API keys listed in API_KEY_MAPPING
 * - Exits with non-zero status if required variables are missing
 */

const required = [
  'TIINGO_API_KEY',
  'GEMINI_API_KEY'
];

const missing = required.filter((k) => !process.env[k]);

console.log('\n🔒 Environment Variable Verification');
if (missing.length === 0) {
  console.log('✅ All required environment variables are configured.');
  process.exit(0);
} else {
  console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('\n🛠️  How to fix: Use the Vercel dashboard or the Vercel CLI to add the missing keys.');
  console.error('\nExample (Vercel CLI):');
  console.error('  vercel env add TIINGO_API_KEY production');
  console.error('  vercel env add GEMINI_API_KEY production');
  process.exit(1);
}
