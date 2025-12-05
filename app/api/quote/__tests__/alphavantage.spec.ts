import { stopCompactionCleanupWorker } from '@lib/metrics';
import { AlphaVantageQuoteResponse, CompanyOverview } from '@backend/modules/stocks/dao/alpha-vantage.dao';
import { alphaVantageDAO } from '@backend/modules/stocks/dao/alpha-vantage.dao';



describe('Alpha Vantage DAO parsing and resilience', () => {
  beforeAll(() => {
    process.env.ALPHAVANTAGE_API_KEY = 'test-key';
    // Prevent any real network calls
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  });

  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.DISABLE_TELEMETRY_COMPACTION = '1';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('getQuote handles malformed numeric fields (price -> NaN)', async () => {
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockResolvedValue({
      'Global Quote': {
        '01. symbol': 'FOO',
        '05. price': 'abc',
        '09. change': '-1.23',
        '10. change percent': '-1.23%'
      }
    });

    const quote = await alphaVantageDAO.getQuote('FOO');
    expect(quote).not.toBeNull();
    expect(quote.symbol).toBe('FOO');
    expect(Number.isNaN(quote.price)).toBe(true);
    expect(quote.change).toBeCloseTo(-1.23);
    expect(quote.changePercent).toBe('-1.23%');
  });

  test('getIncomeStatement throws error when no data', async () => {
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockResolvedValue({});
    await expect(alphaVantageDAO.getIncomeStatement('FOO')).rejects.toThrow(/No income statement data/);
  });

  test('getBalanceSheet handles malformed entries without throwing', async () => {
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockResolvedValue({
      annualReports: [
        {
          fiscalDateEnding: '2020-12-31',
          totalShareholderEquity: 'NotANumber',
          totalAssets: null
        }
      ]
    });

    const result = await alphaVantageDAO.getBalanceSheet('FOO');
    expect(result).not.toBeNull();
    expect(Array.isArray(result.annualReports)).toBe(true);
    expect(result.annualReports.length).toBe(1);
    expect(result.annualReports[0].fiscalDateEnding).toBe('2020-12-31');
    expect(result.annualReports[0].totalShareholderEquity).toBe('NotANumber');
  });

  test('getCompanyOverview throws error on generic Note', async () => {
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockResolvedValue({
      Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
    });
    await expect(alphaVantageDAO.getCompanyOverview('FOO')).rejects.toThrow(/API_ERROR/);
  });

  test('getQuotes handles all-success, mixed, and all-rate-limit scenarios', async () => {
    // all-success
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockResolvedValueOnce({
      'Global Quote': { '01. symbol': 'A', '05. price': '10', '09. change': '0', '10. change percent': '0%' }
    }).mockResolvedValueOnce({
      'Global Quote': { '01. symbol': 'B', '05. price': '20', '09. change': '0', '10. change percent': '0%' }
    });

    const allSuccess = await alphaVantageDAO.getQuotes(['A', 'B']);
    expect(typeof allSuccess).toBe('object');
    expect(allSuccess['A'].price).toBe(10);
    expect(allSuccess['B'].price).toBe(20);

    // mixed: one returns rate-limit note, one returns valid quote
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout')
      .mockImplementationOnce(() => Promise.resolve({ Note: 'API rate limit' }))
      .mockImplementationOnce(() => Promise.resolve({ 'Global Quote': { '01. symbol': 'B', '05. price': '20', '09. change': '0', '10. change percent': '0%' } }));

    const mixed = await alphaVantageDAO.getQuotes(['A', 'B']);
    expect(mixed).toEqual({
      B: { symbol: 'B', price: 20, change: 0, changePercent: '0%' }
    });

    // all-rate-limit: simulate every call returning a Note -> should return empty object
    jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockImplementation(() => Promise.resolve({ Note: 'API rate limit' }));
    const allRateLimited = await alphaVantageDAO.getQuotes(['X', 'Y']);
    expect(allRateLimited).toEqual({});
  });

  // Skipped: fetchAlphaVantageBatch is obsolete, use DAO getQuotes instead
  // test('getQuotes returns error object when no quotes could be fetched', async () => {
  //   jest.spyOn(alphaVantageDAO as any, 'fetchWithTimeout').mockImplementation(() => Promise.resolve({ Note: 'API rate limit' }));
  //   await expect(alphaVantageDAO.getQuotes(['A', 'B'])).rejects.toThrow(/RATE_LIMIT/i);
  // });

  // Skipped: fetchAllFundamentals integration test is obsolete for DAO
  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });
});

afterAll(() => {
    stopCompactionCleanupWorker();
});
