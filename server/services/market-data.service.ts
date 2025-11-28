/**
 * Market Data Service
 *
 * Business logic layer for commodities and market data.
 * Handles caching, fallback, and error handling for commodity prices.
 */
import { alphaVantageDAO, CommodityPrice } from '@/server/dao/alpha-vantage.dao';
import { loadFromCache, saveToCache, getCacheAge } from '@/lib/cache';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CommodityData {
  name: string;
  price: number;
  timestamp: string;
  source: 'alphavantage' | 'cache' | 'fallback';
}

export interface EnergyCommodities {
  oil: CommodityData;
  gas: CommodityData;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MarketDataService {
  private readonly CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours (commodities update slowly)

  /**
   * Get WTI crude oil price
   *
   * Strategy:
   * 1. Check cache (4hr TTL)
   * 2. Try Alpha Vantage
   * 3. Return stale cache if available
   * 4. Return fallback demo data
   *
   * @returns Oil price data
   */
  async getOilPrice(): Promise<CommodityData> {
    const cacheKey = 'commodity-oil';

    // 1. Check cache
    const cached = loadFromCache<CommodityData>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[MarketDataService] Cache hit for oil (age: ${getCacheAge(cacheKey)}ms)`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    // 2. Try Alpha Vantage
    try {
      console.log('[MarketDataService] Fetching oil price from Alpha Vantage');
      const oilData = await alphaVantageDAO.getWTIOil();

      const result: CommodityData = {
        name: oilData.name,
        price: oilData.value,
        timestamp: `${oilData.date} (Alpha Vantage)`,
        source: 'alphavantage'
      };

      saveToCache(cacheKey, result);
      console.log(`[MarketDataService] Oil price: $${result.price}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[MarketDataService] Alpha Vantage failed for oil: ${errorMsg}`);

      // 3. Return stale cache if available
      if (cached) {
        console.log('[MarketDataService] Returning stale cache for oil');
        return {
          ...cached,
          source: 'cache'
        };
      }

      // 4. Return fallback demo data
      console.log('[MarketDataService] Returning fallback data for oil');
      return this.getFallbackOilPrice();
    }
  }

  /**
   * Get natural gas price
   *
   * @returns Natural gas price data
   */
  async getGasPrice(): Promise<CommodityData> {
    const cacheKey = 'commodity-gas';

    // 1. Check cache
    const cached = loadFromCache<CommodityData>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[MarketDataService] Cache hit for gas (age: ${getCacheAge(cacheKey)}ms)`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    // 2. Try Alpha Vantage
    try {
      console.log('[MarketDataService] Fetching gas price from Alpha Vantage');
      const gasData = await alphaVantageDAO.getNaturalGas();

      const result: CommodityData = {
        name: gasData.name,
        price: gasData.value,
        timestamp: `${gasData.date} (Alpha Vantage)`,
        source: 'alphavantage'
      };

      saveToCache(cacheKey, result);
      console.log(`[MarketDataService] Gas price: $${result.price}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[MarketDataService] Alpha Vantage failed for gas: ${errorMsg}`);

      // 3. Return stale cache if available
      if (cached) {
        console.log('[MarketDataService] Returning stale cache for gas');
        return {
          ...cached,
          source: 'cache'
        };
      }

      // 4. Return fallback demo data
      console.log('[MarketDataService] Returning fallback data for gas');
      return this.getFallbackGasPrice();
    }
  }

  /**
   * Get copper price
   *
   * @returns Copper price data
   */
  async getCopperPrice(): Promise<CommodityData> {
    const cacheKey = 'commodity-copper';

    // 1. Check cache
    const cached = loadFromCache<CommodityData>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[MarketDataService] Cache hit for copper (age: ${getCacheAge(cacheKey)}ms)`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    // 2. Try Alpha Vantage
    try {
      console.log('[MarketDataService] Fetching copper price from Alpha Vantage');
      const copperData = await alphaVantageDAO.getCopper();

      const result: CommodityData = {
        name: copperData.name,
        price: copperData.value,
        timestamp: `${copperData.date} (Alpha Vantage)`,
        source: 'alphavantage'
      };

      saveToCache(cacheKey, result);
      console.log(`[MarketDataService] Copper price: $${result.price}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[MarketDataService] Alpha Vantage failed for copper: ${errorMsg}`);

      // 3. Return stale cache if available
      if (cached) {
        console.log('[MarketDataService] Returning stale cache for copper');
        return {
          ...cached,
          source: 'cache'
        };
      }

      // 4. Return fallback demo data
      console.log('[MarketDataService] Returning fallback data for copper');
      return this.getFallbackCopperPrice();
    }
  }

  /**
   * Get energy commodities (oil + gas) in parallel
   *
   * @returns Energy commodities data
   */
  async getEnergyCommodities(): Promise<EnergyCommodities> {
    console.log('[MarketDataService] Fetching energy commodities');

    const [oil, gas] = await Promise.all([
      this.getOilPrice(),
      this.getGasPrice()
    ]);

    return { oil, gas };
  }

  /**
   * Generate fallback oil price (demo data)
   */
  private getFallbackOilPrice(): CommodityData {
    const basePrice = 72.50;
    const variation = (Math.random() - 0.5) * 5;
    const price = basePrice + variation;

    return {
      name: 'WTI Crude Oil',
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - API Error)',
      source: 'fallback'
    };
  }

  /**
   * Generate fallback gas price (demo data)
   */
  private getFallbackGasPrice(): CommodityData {
    const basePrice = 2.85;
    const variation = (Math.random() - 0.5) * 0.5;
    const price = basePrice + variation;

    return {
      name: 'Natural Gas',
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - API Error)',
      source: 'fallback'
    };
  }

  /**
   * Generate fallback copper price (demo data)
   */
  private getFallbackCopperPrice(): CommodityData {
    const basePrice = 4.25;
    const variation = (Math.random() - 0.5) * 0.5;
    const price = basePrice + variation;

    return {
      name: 'Copper',
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }) + ' (Demo Data - API Error)',
      source: 'fallback'
    };
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
