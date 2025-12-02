/**
 * User Tier Management System
 *
 * Exports:
 * - Tier configuration and limits
 * - Usage tracking functions
 * - Quota enforcement utilities
 */

// Configuration
export {
  TIER_CONFIG,
  TIER_HIERARCHY,
  EXAMPLE_SCENARIOS,
  getTierConfig,
  hasFeature,
  hasTierLevel,
  getNextTier,
  calculateBreakEven,
  type TierName,
  type TierLimits,
  type BreakEvenAnalysis,
} from './config';

// Usage Tracking
export {
  getUserUsage,
  checkQuota,
  trackUsage,
  checkAndTrackUsage,
  getUsageStats,
  type UsageAction,
} from './usage-tracker';
