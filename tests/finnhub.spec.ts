import { finnhubService } from '../lib/services/finnhub.service';
import { FinnhubDAO } from '../lib/dao/finnhub.dao';

describe('FinnhubService', () => {
  const symbol = 'AAPL';
  const from = '2025-11-01';
  const to = '2025-11-20';
  let originalEnv: any;

  beforeEach(() => {
    jest.resetAllMocks();
    originalEnv = process.env.FINNHUB_API_KEY;
    (process.env as any).FINNHUB_API_KEY = 'test-key';
  });

  afterEach(() => {
    (process.env as any).FINNHUB_API_KEY = originalEnv;
  });

  test('service returns company news', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { headline: 'Test Headline', link: 'http://test.com', datetime: 123456, source: 'Finnhub', summary: 'Summary' }
        ]),
      })
    );
    const news = await finnhubService.getCompanyNews(symbol, from, to);
    expect(news[0]).toHaveProperty('headline', 'Test Headline');
  });

  test('service returns empty array on error', async () => {
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
    const news = await finnhubService.getCompanyNews(symbol, from, to);
    expect(news).toEqual([]);
  });

  test('service returns general news', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { headline: 'General Headline', link: 'http://general.com', datetime: 123456, source: 'Finnhub', summary: 'General Summary' }
        ]),
      })
    );
    const news = await finnhubService.getGeneralNews('general');
    expect(news[0]).toHaveProperty('headline', 'General Headline');
  });
});

describe('FinnhubDAO', () => {
  const dao = new FinnhubDAO();
  const symbol = 'AAPL';
  const from = '2025-11-01';
  const to = '2025-11-20';

  beforeEach(() => {
    jest.resetAllMocks();
    (process.env as any).FINNHUB_API_KEY = 'test-key';
  });

  test('dao returns company news', async () => {
    dao.fetchWithTimeout = jest.fn(() => Promise.resolve([
      { headline: 'DAO Headline', link: 'http://dao.com', datetime: 123456, source: 'Finnhub', summary: 'DAO Summary' }
    ]));
    const news = await dao.getCompanyNews(symbol, from, to);
    expect(news[0]).toHaveProperty('headline', 'DAO Headline');
  });

  test('dao throws unauthorized error', async () => {
    dao.fetchWithTimeout = jest.fn(() => { throw new Error('HTTP 401: Unauthorized'); });
    await expect(dao.getCompanyNews(symbol, from, to)).rejects.toThrow('Finnhub API unauthorized (401): Check API key');
  });

  test('dao throws rate limit error', async () => {
    dao.fetchWithTimeout = jest.fn(() => { throw new Error('HTTP 429: Rate Limit'); });
    await expect(dao.getCompanyNews(symbol, from, to)).rejects.toThrow('Finnhub API rate limit exceeded (429)');
  });

  test('dao throws invalid response error', async () => {
    dao.fetchWithTimeout = jest.fn(() => Promise.resolve({}));
    await expect(dao.getCompanyNews(symbol, from, to)).rejects.toThrow('Invalid Finnhub response for AAPL');
  });
});
