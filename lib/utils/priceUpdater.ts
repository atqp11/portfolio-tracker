/**
 * Utility to fetch and update stock prices
 */

export interface PriceUpdateResult {
  currentPrice: number | null;
  actualValue: number | null;
  success: boolean;
  error?: string;
}

/**
 * Fetches current price for a stock symbol and calculates actual value
 */
export async function fetchStockPrice(symbol: string, shares: number): Promise<PriceUpdateResult> {
  try {
    // Remove .TO suffix for Alpha Vantage
    const alphaSymbol = symbol.replace('.TO', '');

    const response = await fetch(`/api/quote?symbols=${alphaSymbol}`);

    if (!response.ok) {
      const error = await response.json();
      console.warn(`Failed to fetch price for ${symbol}:`, error);
      return {
        currentPrice: null,
        actualValue: null,
        success: false,
        error: error.error || 'Failed to fetch price',
      };
    }

    const data = await response.json();
    const quoteData = data[alphaSymbol];

    // Check if we got an error response
    if (!quoteData || quoteData.error) {
      return {
        currentPrice: null,
        actualValue: null,
        success: false,
        error: quoteData?.error || 'Invalid price data',
      };
    }

    // Extract the price from the quote object
    const price = quoteData.price;

    if (!price || typeof price !== 'number' || price <= 0) {
      return {
        currentPrice: null,
        actualValue: null,
        success: false,
        error: 'Invalid price value',
      };
    }

    const actualValue = price * shares;

    return {
      currentPrice: price,
      actualValue,
      success: true,
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return {
      currentPrice: null,
      actualValue: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Updates a stock's price in the database
 */
export async function updateStockPrice(
  stockId: string,
  currentPrice: number | null,
  actualValue: number | null,
  previousPrice?: number | null
): Promise<boolean> {
  try {
    const response = await fetch('/api/stocks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: stockId,
        currentPrice,
        actualValue,
        ...(previousPrice !== undefined && { previousPrice }),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating stock price:', error);
    return false;
  }
}

/**
 * Fetches price and updates stock in database
 */
export async function fetchAndUpdateStockPrice(
  stockId: string,
  symbol: string,
  shares: number,
  setPreviousPrice: boolean = false
): Promise<PriceUpdateResult> {
  const priceResult = await fetchStockPrice(symbol, shares);

  if (priceResult.success && priceResult.currentPrice !== null) {
    // If setPreviousPrice is true, set previousPrice to currentPrice for day tracking
    const updateData = setPreviousPrice
      ? {
          currentPrice: priceResult.currentPrice,
          actualValue: priceResult.actualValue,
          previousPrice: priceResult.currentPrice,
        }
      : {
          currentPrice: priceResult.currentPrice,
          actualValue: priceResult.actualValue,
        };

    await fetch('/api/stocks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: stockId,
        ...updateData,
      }),
    });
  }

  return priceResult;
}
