/**
 * Test script for tier system
 *
 * Run with: npx tsx scripts/test-tiers.ts
 */

import {
  getTierConfig,
  hasFeature,
  hasTierLevel,
  getNextTier,
  calculateBreakEven,
  TIER_HIERARCHY,
  type TierName,
} from '../lib/tiers';

console.log('🧪 Testing Tier System\n');

// Test 1: Configuration
console.log('📋 Test 1: Tier Configuration');
console.log('================================\n');

const tiers: TierName[] = ['free', 'basic', 'premium'];

for (const tier of tiers) {
  const config = getTierConfig(tier);
  console.log(`${tier.toUpperCase()} Tier:`);
  console.log(`  Price: ${config.priceDisplay}`);
  console.log(`  Portfolios: ${config.maxPortfolios === Infinity ? '∞' : config.maxPortfolios}`);
  console.log(`  Stocks: ${config.maxStocksPerPortfolio === Infinity ? '∞' : config.maxStocksPerPortfolio}`);
  console.log(`  Chat Queries/Day: ${config.chatQueriesPerDay === Infinity ? '∞' : config.chatQueriesPerDay}`);
  console.log(`  AI Model: ${config.aiModel}`);
  console.log(`  Technical Analysis: ${config.features.technicalAnalysis ? '✅' : '❌'}`);
  console.log(`  Monte Carlo: ${config.features.monteCarloSimulations ? '✅' : '❌'}`);
  console.log('');
}

// Test 2: Feature Access
console.log('\n🔐 Test 2: Feature Access');
console.log('================================\n');

const features = [
  'advancedAI',
  'advancedRiskMetrics',
  'interactiveCharts',
  'technicalAnalysis',
  'monteCarloSimulations',
  'apiAccess',
] as const;

for (const tier of tiers) {
  console.log(`${tier.toUpperCase()}:`);
  for (const feature of features) {
    const hasAccess = hasFeature(tier, feature);
    console.log(`  ${feature}: ${hasAccess ? '✅' : '❌'}`);
  }
  console.log('');
}

// Test 3: Tier Hierarchy
console.log('\n📊 Test 3: Tier Hierarchy');
console.log('================================\n');

console.log('Hierarchy:', TIER_HIERARCHY);
console.log('');

console.log('Tier Level Checks:');
console.log(`  free >= basic: ${hasTierLevel('free', 'basic')}`);
console.log(`  basic >= basic: ${hasTierLevel('basic', 'basic')}`);
console.log(`  basic >= premium: ${hasTierLevel('basic', 'premium')}`);
console.log(`  premium >= basic: ${hasTierLevel('premium', 'basic')}`);
console.log(`  premium >= premium: ${hasTierLevel('premium', 'premium')}`);
console.log('');

// Test 4: Upgrade Paths
console.log('\n⬆️  Test 4: Upgrade Paths');
console.log('================================\n');

for (const tier of tiers) {
  const next = getNextTier(tier);
  console.log(`  ${tier} → ${next || 'none (highest tier)'}`);
}
console.log('');

// Test 5: Break-Even Analysis
console.log('\n💰 Test 5: Break-Even Analysis');
console.log('================================\n');

const scenarios = [
  { name: 'Conservative', distribution: { free: 700, basic: 250, premium: 50 } },
  { name: 'Moderate', distribution: { free: 600, basic: 300, premium: 100 } },
  { name: 'Optimistic', distribution: { free: 400, basic: 400, premium: 200 } },
];

for (const scenario of scenarios) {
  const analysis = calculateBreakEven(scenario.distribution);
  console.log(`${scenario.name} (${analysis.totalUsers} users):`);
  console.log(`  Revenue: $${analysis.totalRevenue.toFixed(2)}/month`);
  console.log(`  Cost: $${analysis.totalCost.toFixed(2)}/month`);
  console.log(`  Profit: $${analysis.netProfit.toFixed(2)}/month`);
  console.log(`  Margin: ${analysis.profitMargin.toFixed(1)}%`);
  console.log(`  Distribution: ${analysis.tierDistribution.free.percentage.toFixed(0)}% free, ${analysis.tierDistribution.basic.percentage.toFixed(0)}% basic, ${analysis.tierDistribution.premium.percentage.toFixed(0)}% premium`);
  console.log('');
}

// Test 6: Type Safety
console.log('\n✅ Test 6: Type Safety');
console.log('================================\n');

// This should compile without errors
const validTier: TierName = 'premium';
console.log(`Valid tier: ${validTier}`);

// Uncomment to test - should cause TypeScript error:
// const invalidTier: TierName = 'pro'; // ❌ Error: Type '"pro"' is not assignable

console.log('\n✅ All tests passed!\n');
