/**
 * Market Data Service
 *
 * Business logic layer for commodities and market data.
 * Handles caching, fallback, and error handling via Data Source Orchestrator.
 *
 * Phase 1: Migrated to distributed cache (Vercel KV / Upstash Redis)
 * Phase 2: Migrated to Data Source Orchestrator (Alpha Vantage → Stale → Demo fallback)
 */
import { DataSourceOrchestrator } from '@lib/data-sources';
import {
  alphaVantageCommodityProvider,
  type CommodityData,
} from '@lib/data-sources/provider-adapters';
import type { TierName } from '@lib/config/types';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EnergyCommodities {
  oil: CommodityData;
  gas: CommodityData;
}

// Re-export CommodityData for backward compatibility
export type { CommodityData };

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MarketDataService {
  private readonly orchestrator: DataSourceOrchestrator;

  constructor() {
    this.orchestrator = DataSourceOrchestrator.getInstance();
  }

  /**
   * Get WTI crude oil price with intelligent fallback via orchestrator
   *
   * Strategy (managed by orchestrator):
   * 1. Check cache (TTL based on tier)
   * 2. Try Alpha Vantage
   * 3. Return stale cache if available
   * 4. If all fail, return demo fallback data (service-level)
   *
   * @param tier - User tier for TTL selection
   * @returns Oil price data
   */
  async getOilPrice(tier?: TierName): Promise<CommodityData> {
    const result = await this.orchestrator.fetchWithFallback<CommodityData>({
      key: 'oil',
      providers: [alphaVantageCommodityProvider],
      cacheKeyPrefix: 'commodities',
      tier: tier || 'free',
      allowStale: true, // Use stale cache before falling back to demo
    });

    // Log cache/staleness info
    if (result.data !== null) {
      if (result.cached) {
        const ageMinutes = Math.round((result.age || 0) / 60000);
        console.log(`[MarketDataService] Cache hit for oil (age: ${ageMinutes}m)`);
      } else {
        console.log(`[MarketDataService] Fresh fetch for oil from ${result.data.source}`);
      }

      return result.data;
    }

    // All providers failed - return demo fallback
    console.log('[MarketDataService] All providers failed for oil, returning demo fallback');
    return this.getFallbackOilPrice();
  }

  /**
   * Get natural gas price with intelligent fallback via orchestrator
   *
   * @param tier - User tier for TTL selection
   * @returns Natural gas price data
   */
  async getGasPrice(tier?: TierName): Promise<CommodityData> {
    const result = await this.orchestrator.fetchWithFallback<CommodityData>({
      key: 'gas',
      providers: [alphaVantageCommodityProvider],
      cacheKeyPrefix: 'commodities',
      tier: tier || 'free',
      allowStale: true,
    });

    if (result.data !== null) {
      if (result.cached) {
        const ageMinutes = Math.round((result.age || 0) / 60000);
        console.log(`[MarketDataService] Cache hit for gas (age: ${ageMinutes}m)`);
      } else {
        console.log(`[MarketDataService] Fresh fetch for gas from ${result.data.source}`);
      }

      return result.data;
    }

    // All providers failed - return demo fallback
    console.log('[MarketDataService] All providers failed for gas, returning demo fallback');
    return this.getFallbackGasPrice();
  }

  /**
   * Get copper price with intelligent fallback via orchestrator
   *
   * @param tier - User tier for TTL selection
   * @returns Copper price data
   */
  async getCopperPrice(tier?: TierName): Promise<CommodityData> {
    const result = await this.orchestrator.fetchWithFallback<CommodityData>({
      key: 'copper',
      providers: [alphaVantageCommodityProvider],
      cacheKeyPrefix: 'commodities',
      tier: tier || 'free',
      allowStale: true,
    });

    if (result.data !== null) {
      if (result.cached) {
        const ageMinutes = Math.round((result.age || 0) / 60000);
        console.log(`[MarketDataService] Cache hit for copper (age: ${ageMinutes}m)`);
      } else {
        console.log(`[MarketDataService] Fresh fetch for copper from ${result.data.source}`);
      }

      return result.data;
    }

    // All providers failed - return demo fallback
    console.log('[MarketDataService] All providers failed for copper, returning demo fallback');
    return this.getFallbackCopperPrice();
  }

  /**
   * Get energy commodities (oil + gas) in parallel
   *
   * @param tier - User tier for TTL selection
   * @returns Energy commodities data
   */
  async getEnergyCommodities(tier?: TierName): Promise<EnergyCommodities> {
    console.log('[MarketDataService] Fetching energy commodities');

    const [oil, gas] = await Promise.all([
      this.getOilPrice(tier),
      this.getGasPrice(tier)
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
