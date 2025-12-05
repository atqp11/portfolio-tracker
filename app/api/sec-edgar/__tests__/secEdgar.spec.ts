import { secEdgarService } from '@backend/modules/stocks/service/sec-edgar.service';

describe('secEdgarService.getCompanyFilings', () => {
  const CIK = '0000320193'; // Example: Apple Inc.

  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks();
    (process.env as any).EDGAR_API_KEY = 'test-key';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('returns data for valid CIK', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ cik: CIK, name: 'Apple Inc.' }),
      })
    );
    const data = await secEdgarService.getCompanyFilings(CIK);
    expect(data).toHaveProperty('cik', CIK);
    expect(data).toHaveProperty('name', 'Apple Inc.');
  });

  test('throws error for missing CIK', async () => {
    await expect(secEdgarService.getCompanyFilings('')).rejects.toThrow(/CIK/);
  });

  test('throws error for network failure', async () => {
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
    await expect(secEdgarService.getCompanyFilings(CIK)).rejects.toThrow(/Network error/);
  });

  test('throws error for non-ok response', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not Found'),
      })
    );
    await expect(secEdgarService.getCompanyFilings(CIK)).rejects.toThrow(/SEC EDGAR API error/);
  });

  test('throws error for invalid JSON', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => { throw new Error('bad json'); },
      })
    );
    await expect(secEdgarService.getCompanyFilings(CIK)).rejects.toThrow(/Invalid JSON/);
  });

  test('throws error for unexpected response structure', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ foo: 'bar' }),
      })
    );
    await expect(secEdgarService.getCompanyFilings(CIK)).rejects.toThrow(/Unexpected SEC EDGAR API response structure/);
  });
  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });
});
