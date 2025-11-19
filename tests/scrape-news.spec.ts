import { scrapeNewsHeadlines } from '../lib/api/braveSearch';

describe('scrapeNewsHeadlines', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return an array of headlines for a valid news site', async () => {
    // Mock fetch to return sample HTML
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(`
        <html>
          <body>
            <a data-testid="Heading" href="/news1">Headline 1</a>
            <a data-testid="Heading" href="/news2">Headline 2</a>
          </body>
        </html>
      `),
      })
    );
    const url = 'https://www.reuters.com/';
    const headlines = await scrapeNewsHeadlines(url);
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
    await expect(scrapeNewsHeadlines('https://invalid-url-for-testing.com/')).rejects.toThrow();
  });
});
