import { fmpService } from '../lib/services/fmp.service';

describe('fmpService.getQuote', () => {
  const symbol = 'AAPL';

  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks();
    (process.env as any).FMP_API_KEY = 'test-key';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('returns quote for valid symbol', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ symbol, price: 150, change: 1, changesPercentage: 0.67 }]),
      })
    );
    const quote = await fmpService.getQuote(symbol);
    expect(quote).toHaveProperty('symbol', symbol);
    expect(quote).toHaveProperty('price', 150);
    expect(quote).toHaveProperty('change', 1);
    expect(quote).toHaveProperty('changePercent', '0.67%');
  });

  test('returns null for missing API key', async () => {
    (process.env as any).FMP_API_KEY = '';
    const quote = await fmpService.getQuote(symbol);
    expect(quote).toBeNull();
  });

  test('returns null for network error', async () => {
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
    const quote = await fmpService.getQuote(symbol);
    expect(quote).toBeNull();
  });

  test('returns null for non-ok response', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Legacy Endpoint'),
      })
    );
    const quote = await fmpService.getQuote(symbol);
    expect(quote).toBeNull();
  });

  test('returns null for empty array', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
    const quote = await fmpService.getQuote(symbol);
    expect(quote).toBeNull();
  });

  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });
});

describe('fmpService.getQuotes', () => {
  const symbols = ['AAPL', 'MSFT'];

  beforeEach(() => {
    jest.resetAllMocks();
    (process.env as any).FMP_API_KEY = 'test-key';
  });

  test('returns quotes for multiple symbols', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('AAPL')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ symbol: 'AAPL', price: 150, change: 1, changesPercentage: 0.67 }]),
        });
      }
      if (url.includes('MSFT')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ symbol: 'MSFT', price: 300, change: 2, changesPercentage: 0.5 }]),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', text: () => Promise.resolve('Not Found') });
    });
    const quotes = await fmpService.getQuotes(symbols);
    expect(quotes['AAPL']).toHaveProperty('price', 150);
    expect(quotes['MSFT']).toHaveProperty('price', 300);
  });

  test('returns empty object for missing API key', async () => {
    (process.env as any).FMP_API_KEY = '';
    const quotes = await fmpService.getQuotes(symbols);
    expect(quotes).toEqual({});
  });
});
