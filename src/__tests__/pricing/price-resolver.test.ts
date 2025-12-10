import path from 'path';

describe('price resolver and pricing tiers', () => {
  const resetAndImport = () => {
    // Clear module cache so tests can change process.env between requires
    jest.resetModules();
    // Import after resetting modules
    // Use relative paths to avoid TS path alias issues in tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../backend/modules/subscriptions/config/plans.config');
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
    const { getStripePriceId } = mod;
    expect(getStripePriceId('basic', 'monthly')).toBe('price_basic_monthly_test');
  });

  it('throws error when server env missing (no fallbacks)', () => {
    // No server env set
    const mod = resetAndImport();
    const { getStripePriceId } = mod;
    expect(() => getStripePriceId('basic', 'monthly')).toThrow('No Stripe Price ID configured for plan: basic (monthly)');
  });

  it('resolves all tiers (free, basic, premium) correctly', () => {
    process.env.STRIPE_PRICE_BASIC_ANNUAL = 'price_basic_annual';
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_premium_monthly';
    const mod = resetAndImport();
    const { getStripePriceId } = mod;
    // FREE tier throws error
    expect(() => getStripePriceId('free', 'monthly')).toThrow('Free tier does not have a Stripe Price ID');
    // Paid tiers return Price IDs
    expect(getStripePriceId('basic', 'annual')).toBe('price_basic_annual');
    expect(getStripePriceId('premium', 'monthly')).toBe('price_premium_monthly');
  });

  it('handles lowercase billing parameter', () => {
    process.env.STRIPE_PRICE_BASIC_MONTHLY = 'price_basic_monthly';
    const mod = resetAndImport();
    const { getStripePriceId } = mod;
    // Should work with lowercase 'monthly'
    expect(getStripePriceId('basic', 'monthly')).toBe('price_basic_monthly');
  });

  it('uses annualPrice from PLAN_METADATA', () => {
    // Set all required env vars to avoid errors during import
    process.env.STRIPE_PRICE_BASIC_MONTHLY = 'price_basic_monthly';
    process.env.STRIPE_PRICE_BASIC_ANNUAL = 'price_basic_annual';
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_premium_monthly';
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL = 'price_premium_annual';
    
    const mod = resetAndImport();
    const { PLAN_METADATA } = mod;
    
    expect(PLAN_METADATA.basic.annualPrice).toBe(59.99);
    expect(PLAN_METADATA.premium.annualPrice).toBe(159.99);
    expect(PLAN_METADATA.free.annualPrice).toBe(null); // FREE has no price
  });
});
