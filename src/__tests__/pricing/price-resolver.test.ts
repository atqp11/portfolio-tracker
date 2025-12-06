import path from 'path';

describe('price resolver and pricing tiers', () => {
  const resetAndImport = () => {
    // Clear module cache so tests can change process.env between requires
    jest.resetModules();
    // Import after resetting modules
    // Use relative paths to avoid TS path alias issues in tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../lib/pricing/tiers');
  };

  afterEach(() => {
    // Clear env keys used by tests
    delete process.env.STRIPE_PRICE_FREE_MONTHLY;
    delete process.env.STRIPE_PRICE_FREE_ANNUAL;
    delete process.env.STRIPE_PRICE_BASIC_MONTHLY;
    delete process.env.STRIPE_PRICE_BASIC_ANNUAL;
    delete process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
    delete process.env.STRIPE_PRICE_PREMIUM_ANNUAL;
    jest.restoreAllMocks();
  });

  it('resolves price ID from server env STRIPE_PRICE_*', () => {
    process.env.STRIPE_PRICE_BASIC_MONTHLY = 'price_basic_monthly_test';
    const mod = resetAndImport();
    const { resolvePriceId } = mod;
    expect(resolvePriceId('basic', 'monthly')).toBe('price_basic_monthly_test');
  });

  it('returns empty string when server env missing (no fallbacks)', () => {
    // No server env set
    const mod = resetAndImport();
    const { resolvePriceId } = mod;
    expect(resolvePriceId('basic', 'monthly')).toBe('');
  });

  it('resolves all tiers (free, basic, premium) correctly', () => {
    process.env.STRIPE_PRICE_FREE_MONTHLY = 'price_free_monthly';
    process.env.STRIPE_PRICE_BASIC_ANNUAL = 'price_basic_annual';
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_premium_monthly';
    const mod = resetAndImport();
    const { resolvePriceId } = mod;
    expect(resolvePriceId('free', 'monthly')).toBe('price_free_monthly');
    expect(resolvePriceId('basic', 'annual')).toBe('price_basic_annual');
    expect(resolvePriceId('premium', 'monthly')).toBe('price_premium_monthly');
  });

  it('handles case-insensitive billing parameter', () => {
    process.env.STRIPE_PRICE_BASIC_MONTHLY = 'price_basic_monthly';
    const mod = resetAndImport();
    const { resolvePriceId } = mod;
    // Both should work and map to same env var
    expect(resolvePriceId('basic', 'monthly')).toBe('price_basic_monthly');
    expect(resolvePriceId('basic', 'MONTHLY' as any)).toBe('price_basic_monthly');
  });

  it('uses cfg.annualPrice when present for displayed annual price', () => {
    // Set all required env vars to avoid errors during import
    process.env.STRIPE_PRICE_FREE_MONTHLY = 'price_free_monthly';
    process.env.STRIPE_PRICE_FREE_ANNUAL = 'price_free_annual';
    process.env.STRIPE_PRICE_BASIC_MONTHLY = 'price_basic_monthly';
    process.env.STRIPE_PRICE_BASIC_ANNUAL = 'price_basic_annual';
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_premium_monthly';
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL = 'price_premium_annual';
    
    const mod = resetAndImport();
    const { PRICING_TIERS } = mod;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require('../../lib/tiers/config').TIER_CONFIG;
    
    const basicTier = PRICING_TIERS.find((t: any) => t.id === 'basic');
    expect(basicTier.price.annual).toBe(cfg.basic.annualPrice);
    
    const premiumTier = PRICING_TIERS.find((t: any) => t.id === 'premium');
    expect(premiumTier.price.annual).toBe(cfg.premium.annualPrice);
  });
});
