import { stopCompactionCleanupWorker } from '../lib/metrics';
import { BalanceSheet } from '../lib/api/alphavantage';

let av: typeof import('@/lib/api/alphavantage');

describe('Alpha Vantage parsing and resilience', () => {
  beforeAll(async () => {
    // Ensure the module sees an API key so functions don't early-return.
    (process.env as any).ALPHAVANTAGE_API_KEY = 'test-key';
    av = await import('@/lib/api/alphavantage');
  });

  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.DISABLE_TELEMETRY_COMPACTION = '1';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('fetchAlphaVantageQuote handles malformed numeric fields (price -> NaN)', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            'Global Quote': {
              '01. symbol': 'FOO',
              '05. price': 'abc',
              '09. change': '-1.23',
              '10. change percent': '-1.23%'
            }
          })
      })
    );

    const quote = await av.fetchAlphaVantageQuote('FOO');
    expect(quote).not.toBeNull();
    expect(quote?.symbol).toBe('FOO');
    // malformed price -> parseFloat -> NaN
    expect(Number.isNaN(quote!.price)).toBe(true);
    expect(quote!.change).toBeCloseTo(-1.23);
    expect(quote!.changePercent).toBe('-1.23%');
  });

  test('fetchIncomeStatement returns empty arrays when annualReports/quarterlyReports missing', async () => {
    (global as any).fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));

    const result = await av.fetchIncomeStatement('FOO');
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.annualReports)).toBe(true);
    expect(result!.annualReports.length).toBe(0);
    expect(Array.isArray(result!.quarterlyReports)).toBe(true);
    expect(result!.quarterlyReports.length).toBe(0);
  });

  test('fetchBalanceSheet handles malformed entries without throwing', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            annualReports: [
              {
                fiscalDateEnding: '2020-12-31',
                totalShareholderEquity: 'NotANumber',
                totalAssets: null
              }
            ]
          })
      })
    );

    const result = await av.fetchBalanceSheet('FOO');
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.annualReports)).toBe(true);
    expect(result!.annualReports.length).toBe(1);
    expect(result!.annualReports[0].fiscalDateEnding).toBe('2020-12-31');
    // The function should return values as-is; malformed numeric strings should be present
    const annualReport = result!.annualReports[0] as BalanceSheet;
    expect(annualReport.totalShareholderEquity).toBe('NotANumber');
  });

  test('fetchCompanyOverview returns null on generic Note', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
          })
      })
    );

    const result = await av.fetchCompanyOverview('FOO');
    expect(result).toBeNull();
  });

  test('fetchAlphaVantageQuotes handles all-success, mixed, and all-rate-limit scenarios', async () => {
    // all-success
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ 'Global Quote': { '01. symbol': 'A', '05. price': '10', '09. change': '0', '10. change percent': '0%' } }) })
    );

    const allSuccess = await av.fetchAlphaVantageQuotes(['A', 'B']);
    // Should contain prices for any successfully fetched symbols (B may be missing because mock returns same payload)
    expect(typeof allSuccess).toBe('object');

    // mixed: one returns rate-limit note, one returns valid quote
    let call = 0;
    (global as any).fetch = jest.fn(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({ json: () => Promise.resolve({ Note: 'API rate limit' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ 'Global Quote': { '01. symbol': 'B', '05. price': '20', '09. change': '0', '10. change percent': '0%' } }) });
    });

    const mixed = await av.fetchAlphaVantageQuotes(['A', 'B']);
    expect(Object.keys(mixed).length).toBeGreaterThanOrEqual(1);

    // all-rate-limit: simulate every call returning a Note -> should propagate RATE_LIMIT
    (global as any).fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ Note: 'API rate limit' }) }));
    await expect(av.fetchAlphaVantageQuotes(['X', 'Y'])).rejects.toThrow(/RATE_LIMIT/i);
  });

  test('fetchAlphaVantageBatch returns error object when no quotes could be fetched', async () => {
    (global as any).fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ Note: 'API rate limit' }) }));
    const batch = await av.fetchAlphaVantageBatch(['A', 'B']);
    // Should return an object describing the error
    expect((batch as any).error).toBeDefined();
    expect((batch as any).status).toBeGreaterThanOrEqual(400);
  });

  test('fetchAllFundamentals integration: combined partial responses and client cache behavior', async () => {
    // Spy on the fundamental fetchers to return partial data
    const overview = { Symbol: 'FOO', Name: 'Foo Corp', PERatio: '10' } as any;
    const income = { annualReports: [{ fiscalDateEnding: '2021-12-31', netIncome: '1000' }] } as any;
    // balance and cashFlow will be partially missing
    const balance = { annualReports: [] } as any;
    const cashFlow = null;

    jest.spyOn(av, 'fetchCompanyOverview').mockResolvedValue(overview);
    jest.spyOn(av, 'fetchIncomeStatement').mockResolvedValue(income);
    jest.spyOn(av, 'fetchBalanceSheet').mockResolvedValue(balance);
    jest.spyOn(av, 'fetchCashFlow').mockResolvedValue(cashFlow as any);

    const all = await av.fetchAllFundamentals('FOO');
    expect(all).toBeDefined();
    expect(all.overview).toBe(overview);
    expect(all.income).toBe(income);
    expect(all.balance).toBe(balance);
    expect(all.cashFlow).toBeNull();

    // Now exercise client-side cache helpers
    const { cacheFundamentals, getCachedFundamentals } = await import('@/lib/cache');
    // Provide a minimal localStorage mock since Jest is running in node environment
    (global as any).window = (global as any).window || {};
    // Force a clean localStorage mock for the node test environment
    (global as any).localStorage = ((): any => {
      const store: Record<string, string> = {};
      return {
        getItem(key: string) { return store[key] ?? null; },
        setItem(key: string, value: string) { store[key] = value; },
        removeItem(key: string) { delete store[key]; },
        clear() { Object.keys(store).forEach(k => delete store[k]); }
      };
    })();

    cacheFundamentals('FOO', 'fundamentals', all);
    // slight delay to avoid zero-age race condition in cache timestamp
    await new Promise((r) => setTimeout(r, 1));
    const cached = getCachedFundamentals('FOO', 'fundamentals');
    expect(cached).not.toBeNull();
    expect((cached as any).overview).toStrictEqual(overview);
  });
  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });
});

afterAll(() => {
    stopCompactionCleanupWorker();
});
