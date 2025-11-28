/**
 * Base Data Access Object
 *
 * Provides common HTTP client functionality for all DAO classes.
 * Handles timeouts, error handling, and response parsing.
 */
export abstract class BaseDAO {
  /**
   * Fetch data with automatic timeout and error handling
   *
   * @param url - The URL to fetch
   * @param timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns Parsed JSON response
   * @throws Error on timeout, network error, or HTTP error
   */
  protected async fetchWithTimeout<T = any>(
    url: string,
    timeoutMs: number = 5000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}${bodyText ? ` | ${bodyText}` : ''}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with POST method
   */
  protected async postWithTimeout<T = any>(
    url: string,
    body: any,
    timeoutMs: number = 5000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if API response indicates a rate limit error
   */
  protected isRateLimitError(data: any): boolean {
    const msg =
      data?.['Note'] ||
      data?.['Information'] ||
      data?.['Error Message'] ||
      data?.message ||
      '';
    return msg.toLowerCase().includes('rate limit');
  }

  /**
   * Check if API response indicates an error
   */
  protected hasApiError(data: any): boolean {
    return !!(
      data?.['Error Message'] ||
      data?.['Note'] ||
      data?.['Information'] ||
      data?.error
    );
  }

  /**
   * Extract error message from API response
   */
  protected getApiErrorMessage(data: any): string {
    return (
      data?.['Error Message'] ||
      data?.['Note'] ||
      data?.['Information'] ||
      data?.error ||
      data?.message ||
      'Unknown API error'
    );
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
    return url.toString();
  }
}
