import { finnhubService } from '@/server/services/finnhub.service';

describe('scrapeNewsHeadlines', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (process.env as any).FINNHUB_API_KEY = 'test-key';
  });

  test('should return an array of headlines for a valid news site', async () => {
    // Mock fetch to return Finnhub-style JSON array
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { headline: 'Headline 1', url: '/news1' },
          { headline: 'Headline 2', url: '/news2' }
        ])
      })
    );
    const url = 'AAPL'; // Use ticker to trigger Finnhub branch
    const headlines = await finnhubService.scrapeNewsHeadlines(url);
    expect(Array.isArray(headlines)).toBe(true);
    expect(headlines.length).toBe(2);
    expect(headlines[0].headline).toBe('Headline 1');
    expect(headlines[0].link).toBe('/news1');
    expect(headlines[1].headline).toBe('Headline 2');
    expect(headlines[1].link).toBe('/news2');
  });

  test('should throw an error for a failed fetch', async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', text: () => Promise.resolve('Not Found') })
    );
    const headlines = await finnhubService.scrapeNewsHeadlines('AAPL');
    expect(Array.isArray(headlines)).toBe(true);
    expect(headlines.length).toBe(0);
  });
});
