/**
 * Quota Middleware
 *
 * Integrates with existing lib/tiers system for quota enforcement.
 * Provides middleware functions for checking and tracking usage.
 */

import { TierName } from '@/lib/tiers/config';
import {
  checkAndTrackUsage,
  checkQuota,
  UsageAction,
} from '@/lib/tiers/usage-tracker';
import { QuotaExceededError } from './error-handler.middleware';

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
