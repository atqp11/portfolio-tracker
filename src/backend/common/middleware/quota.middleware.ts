/**
 * Quota Middleware
 *
 * Integrates with existing lib/tiers system for quota enforcement.
 * Provides middleware functions for checking and tracking usage.
 */

import { NextRequest } from 'next/server';
import { AuthMiddleware } from './auth.middleware';
import { TierName } from '@lib/tiers/config';
import {
  checkAndTrackUsage,
  checkQuota,
  UsageAction,
} from '@lib/tiers/usage-tracker';
import { QuotaExceededError } from './error-handler.middleware';
import { getTierConfig } from '@lib/tiers';
import { portfolioRepository } from '@backend/modules/portfolio/repository/portfolio.repository';
import { stockRepository } from '@backend/modules/stocks/repository/stock.repository';

/**
 * Quota check result type
 */
export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}

/**
 * Quota Middleware
 */
export class QuotaMiddleware {
  /**
   * Enforce quota for a specific feature
   * Throws QuotaExceededError if quota is exceeded
   */
  static async enforce(
    userId: string,
    action: UsageAction,
    tier: TierName
  ): Promise<void> {
    const result = await checkAndTrackUsage(userId, action, tier);

    if (!result.allowed) {
      throw new QuotaExceededError(
        result.reason || 'Quota limit exceeded for this feature',
        {
          action,
          tier,
        }
      );
    }
  }

  /**
   * Check quota without tracking (read-only check)
   * Returns quota status without incrementing usage
   */
  static async check(
    userId: string,
    action: UsageAction,
    tier: TierName
  ): Promise<QuotaCheckResult> {
    // Use checkQuota which doesn't track usage
    return await checkQuota(userId, action, tier);
  }

  /**
   * Get remaining quota for a feature
   */
  static async getRemaining(
    userId: string,
    action: UsageAction,
    tier: TierName
  ): Promise<number | typeof Infinity> {
    const result = await this.check(userId, action, tier);

    if (result.limit === Infinity) {
      return Infinity;
    }

    return result.remaining;
  }

  /**
   * Check if user has access to a feature (without consuming quota)
   */
  static async hasAccess(
    userId: string,
    action: UsageAction,
    tier: TierName
  ): Promise<boolean> {
    try {
      const result = await this.check(userId, action, tier);
      return result.allowed;
    } catch {
      return false;
    }
  }

  /**
   * Get quota usage summary for multiple features
   */
  static async getUsageSummary(
    userId: string,
    tier: TierName,
    actions: UsageAction[]
  ): Promise<Record<UsageAction, QuotaCheckResult>> {
    const summary: Record<string, QuotaCheckResult> = {};

    await Promise.all(
      actions.map(async (action) => {
        summary[action] = await this.check(userId, action, tier);
      })
    );

    return summary as Record<UsageAction, QuotaCheckResult>;
  }
}

/**
 * Quota decorator for route handlers
 * Usage:
 * ```typescript
 * @withQuota('chatQuery')
 * export async function POST(req: NextRequest) { ... }
 * ```
 */
export function withQuota(action: UsageAction) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract userId and tier from request context
      // This is a placeholder - actual implementation depends on auth setup
      const userId = (this as any).userId;
      const tier = (this as any).tier;

      if (userId && tier) {
        await QuotaMiddleware.enforce(userId, action, tier);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper to create quota-aware route handler
 */
export function withQuotaCheck(
  action: UsageAction,
  handler: (userId: string, tier: TierName, ...args: any[]) => Promise<any>
) {
  return async (userId: string, tier: TierName, ...args: any[]) => {
    await QuotaMiddleware.enforce(userId, action, tier);
    return handler(userId, tier, ...args);
  };
}

/**
 * Portfolio count quota middleware
 * Checks if user can create another portfolio based on their tier
 */
export function withPortfolioQuota<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (request: NextRequest, context: any = {}) => {
    const profile = await AuthMiddleware.requireProfile();
    const tier = profile.tier as TierName;
    const tierConfig = getTierConfig(tier);

    const portfolios = await portfolioRepository.findAll();
    if (portfolios.length >= tierConfig.maxPortfolios) {
      throw new QuotaExceededError(
        `You have reached the limit of ${tierConfig.maxPortfolios} portfolios for the ${tier} tier.`,
        { upgradeUrl: '/pricing' }
      );
    }

    return handler(request, context);
  }) as T;
}

/**
 * Stock count quota middleware
 * Checks if user can add another stock to a portfolio based on their tier
 */
export function withStockQuota<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (request: NextRequest, context: any = {}) => {
    const profile = await AuthMiddleware.requireProfile();
    const tier = profile.tier as TierName;
    const tierConfig = getTierConfig(tier);

    // Get portfolioId from request body (already parsed by validation middleware)
    let portfolioId = context.body?.portfolioId;
    
    // If not in context.body, try parsing the request
    if (!portfolioId) {
      try {
        const body = await request.clone().json();
        portfolioId = body.portfolioId;
      } catch (error) {
        console.warn("Could not extract portfolioId from request for stock quota check");
        return handler(request, context);
      }
    }

    if (!portfolioId) {
      console.warn("Portfolio ID not found for stock quota check");
      return handler(request, context);
    }

    const stocks = await stockRepository.findByPortfolioId(portfolioId);
    if (stocks.length >= tierConfig.maxStocksPerPortfolio) {
      throw new QuotaExceededError(
        `You have reached the limit of ${tierConfig.maxStocksPerPortfolio} stocks for the ${tier} tier in this portfolio.`,
        { upgradeUrl: '/pricing' }
      );
    }

    return handler(request, context);
  }) as T;
}