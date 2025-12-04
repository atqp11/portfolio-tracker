/**
 * Configuration Validation
 *
 * Validates configuration at startup to catch errors before deployment:
 * - Missing required API keys
 * - Production without Redis cache
 * - No enabled providers
 * - Invalid environment variables
 */

import { CACHE_PROVIDER_CONFIG, getCacheProviderName } from './cache-provider.config';
import { PROVIDER_CONFIG } from './providers.config';
import { getMissingRequiredKeys, printAPIKeyGuide } from './api-keys.config';
import type { ValidationResult } from './types';

/**
 * Validate application configuration
 *
 * @returns Validation result with errors, warnings, and info messages
 */
export function validateConfiguration(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  console.log('\n🔍 Validating Configuration...\n');

  // ========================================
  // 1. Check Required API Keys
  // ========================================

  const missingKeys = getMissingRequiredKeys();
  if (missingKeys.length > 0) {
    errors.push(`Missing required API keys: ${missingKeys.join(', ')}`);
  }

  // ========================================
  // 2. Check Cache Provider
  // ========================================

  if (
    !CACHE_PROVIDER_CONFIG.vercelKV?.restUrl &&
    !CACHE_PROVIDER_CONFIG.upstash?.url
  ) {
    warnings.push(
      'No Redis cache configured. Using in-memory cache (not suitable for production)'
    );
  }

  // ========================================
  // 3. Production Without Redis = ERROR
  // ========================================

  if (
    process.env.NODE_ENV === 'production' &&
    CACHE_PROVIDER_CONFIG.type === 'memory'
  ) {
    errors.push(
      '❌ CRITICAL: Production requires Redis (Vercel KV or Upstash). ' +
        'In-memory cache will cause 0% hit rate in serverless.'
    );
  }

  // ========================================
  // 4. Check Provider Availability
  // ========================================

  // Check quote providers
  const quoteProviders = [PROVIDER_CONFIG.tiingo, PROVIDER_CONFIG.yahooFinance].filter(
    p => p.enabled
  );

  if (quoteProviders.length === 0) {
    errors.push(
      'No quote providers enabled. Check FEATURE_TIINGO_ENABLED or provider config.'
    );
  }

  // Check news providers
  const newsProviders = [PROVIDER_CONFIG.rss].filter(p => p.enabled);
  if (newsProviders.length === 0) {
    warnings.push('No news providers enabled. Check FEATURE_RSS_NEWS_ENABLED.');
  }

  // ========================================
  // 5. Check for Conflicting Env Vars
  // ========================================

  if (process.env.UPSTASH_REDIS_URL && process.env.KV_REST_API_URL) {
    warnings.push(
      'Both Upstash and Vercel KV credentials found. Will use Upstash (higher priority).'
    );
  }

  // ========================================
  // 6. Validate Provider Configurations
  // ========================================

  for (const [name, config] of Object.entries(PROVIDER_CONFIG)) {
    if (config.enabled) {
      // Check timeout is reasonable
      if (config.timeout > 60000) {
        warnings.push(
          `Provider ${name} has timeout > 60s (${config.timeout}ms). This may cause UX issues.`
        );
      }

      // Check circuit breaker threshold
      if (config.circuitBreaker.failureThreshold < 3) {
        warnings.push(
          `Provider ${name} has low failure threshold (${config.circuitBreaker.failureThreshold}). May open circuit too quickly.`
        );
      }

      // Check if API key is required but missing
      if (config.apiKey !== undefined && !config.apiKey) {
        warnings.push(`Provider ${name} is enabled but API key is missing.`);
      }
    }
  }

  // ========================================
  // Log Results
  // ========================================

  if (errors.length > 0) {
    console.error('❌ Configuration Errors:\n');
    errors.forEach(err => console.error(`   ${err}`));
    console.error('\n💡 Tip: Run printAPIKeyGuide() to see setup instructions\n');

    return {
      success: false,
      errors,
      warnings,
      info,
    };
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration Warnings:\n');
    warnings.forEach(warn => console.warn(`   ${warn}\n`));
  }

  // Success - log info
  console.log('✅ Configuration Validated Successfully\n');
  console.log(`   Cache Provider: ${getCacheProviderName()}`);

  const primaryQuote = quoteProviders.find(p => p.priority === 1);
  if (primaryQuote) {
    console.log(`   Quote Primary: ${primaryQuote.name}`);
  }

  const enabledCount = Object.values(PROVIDER_CONFIG).filter(p => p.enabled).length;
  console.log(`   Enabled Providers: ${enabledCount}`);
  console.log('');

  return {
    success: true,
    errors: [],
    warnings,
    info: [
      `Cache: ${getCacheProviderName()}`,
      `Quote Primary: ${primaryQuote?.name || 'none'}`,
      `Enabled Providers: ${enabledCount}`,
    ],
  };
}

/**
 * Validate configuration and throw error if validation fails
 * Use this in application startup code
 */
export function validateConfigurationOrThrow(): void {
  const result = validateConfiguration();

  if (!result.success) {
    throw new Error(
      `Configuration validation failed:\n${result.errors.join('\n')}`
    );
  }
}

/**
 * Check if configuration is production-ready
 *
 * @returns True if configuration is production-ready
 */
export function isProductionReady(): boolean {
  const result = validateConfiguration();

  if (!result.success) {
    return false;
  }

  // Check for production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    // Must have Redis
    if (CACHE_PROVIDER_CONFIG.type === 'memory') {
      return false;
    }

    // Must have all required API keys
    const missingKeys = getMissingRequiredKeys();
    if (missingKeys.length > 0) {
      return false;
    }

    // Must have at least one quote provider
    const quoteProviders = [PROVIDER_CONFIG.tiingo, PROVIDER_CONFIG.yahooFinance].filter(
      p => p.enabled
    );
    if (quoteProviders.length === 0) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Auto-run Validation on Module Load (Server-Side Only)
// ============================================================================

if (typeof window === 'undefined') {
  try {
    validateConfiguration();
  } catch (error) {
    console.error('[Config] Configuration validation failed:', error);

    // In development, continue anyway but show warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Continuing in development mode despite validation errors');
    } else {
      // In production, exit
      process.exit(1);
    }
  }
}
