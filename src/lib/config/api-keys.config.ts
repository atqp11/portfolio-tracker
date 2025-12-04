/**
 * API Key Mapping Reference
 *
 * Documents which API key is used by which provider
 * Helps with setup and troubleshooting
 */

import type { APIKeyInfo } from './types';

export const API_KEY_MAPPING: Record<string, APIKeyInfo> = {
  tiingo: {
    envVar: 'TIINGO_API_KEY',
    required: true,
    usage: 'Stock quotes (primary), commodities',
    documentation: 'https://api.tiingo.com/documentation/general/overview',
    freeTier: 'Yes - $0/month (500 req/day)',
    paidTier: 'Power - $10/month (unlimited)',
  },

  gemini: {
    envVar: 'GEMINI_API_KEY',
    required: true,
    usage: 'AI chat, analysis, summaries (primary)',
    documentation: 'https://ai.google.dev/gemini-api/docs',
    freeTier: 'Yes - $0/month (60 req/min)',
  },

  groq: {
    envVar: 'GROQ_API_KEY',
    required: false,
    usage: 'AI fallback, sentiment analysis',
    documentation: 'https://console.groq.com/docs',
    freeTier: 'Yes - $0/month (30 req/min)',
  },

  vercelKV: {
    envVar: 'KV_REST_API_URL',
    required: false,
    usage: 'Vercel KV (Upstash managed by Vercel)',
    documentation: 'https://vercel.com/docs/storage/vercel-kv',
    freeTier: 'Yes - $0/month (30K commands)',
    note: 'Auto-configured in Vercel dashboard. Also requires KV_REST_API_TOKEN.',
  },

  upstashRedis: {
    envVar: 'UPSTASH_REDIS_URL',
    required: false,
    usage: 'Direct Upstash Redis connection',
    documentation: 'https://upstash.com/docs/redis',
    freeTier: 'Yes - $0/month (10K commands/day)',
    note: 'Also requires UPSTASH_REDIS_TOKEN.',
  },

  yahooFinance: {
    envVar: '',
    required: false,
    usage: 'Quote fallback (internal use only)',
    documentation: 'https://finance.yahoo.com',
    freeTier: 'Free',
    restrictions: '⚠️ Cannot redistribute data per ToS. Use as fallback only.',
  },

  alphaVantage: {
    envVar: 'ALPHAVANTAGE_API_KEY',
    required: false,
    usage: 'Commodities fallback only',
    documentation: 'https://www.alphavantage.co/documentation/',
    freeTier: 'Yes - $0/month (25 req/day)',
    paidTier: 'Premium - $50/month',
  },

  secEdgar: {
    envVar: '',
    required: false,
    usage: 'SEC filings (public data)',
    documentation: 'https://www.sec.gov/edgar',
    freeTier: 'Free - Public domain data',
    note: 'No API key required. Must include User-Agent header with contact email.',
  },

  rss: {
    envVar: '',
    required: false,
    usage: 'News feeds (RSS parsing)',
    documentation: 'https://news.google.com/rss',
    freeTier: 'Free',
    note: 'No API key required for RSS feeds.',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get list of missing required API keys
 *
 * @returns Array of missing required API keys with provider names
 *
 * @example
 * ```ts
 * const missing = getMissingRequiredKeys();
 * if (missing.length > 0) {
 *   console.error('Missing required keys:', missing);
 * }
 * ```
 */
export function getMissingRequiredKeys(): string[] {
  const missing: string[] = [];

  for (const [provider, config] of Object.entries(API_KEY_MAPPING)) {
    if (config.required && config.envVar) {
      if (!process.env[config.envVar]) {
        missing.push(`${config.envVar} (${provider})`);
      }
    }
  }

  return missing;
}

/**
 * Check if a specific API key is configured
 *
 * @param provider - Provider name
 * @returns True if API key is configured
 */
export function isAPIKeyConfigured(provider: keyof typeof API_KEY_MAPPING): boolean {
  const config = API_KEY_MAPPING[provider];
  if (!config.envVar) {
    return true; // No API key required
  }
  return !!process.env[config.envVar];
}

/**
 * Get API key configuration for a provider
 *
 * @param provider - Provider name
 * @returns API key configuration or undefined
 */
export function getAPIKeyConfig(
  provider: keyof typeof API_KEY_MAPPING
): APIKeyInfo | undefined {
  return API_KEY_MAPPING[provider];
}

/**
 * Print API key setup guide to console
 */
export function printAPIKeyGuide(): void {
  console.log('\n📋 API Key Setup Guide\n');

  for (const [provider, config] of Object.entries(API_KEY_MAPPING)) {
    const status = config.required ? '🔴 REQUIRED' : '🟢 OPTIONAL';
    console.log(`${status} ${provider}`);
    console.log(`   Usage: ${config.usage}`);

    if (config.envVar) {
      const configured = process.env[config.envVar] ? '✅' : '❌';
      console.log(`   Env Var: ${config.envVar} ${configured}`);
    } else {
      console.log(`   Env Var: None required`);
    }

    if (config.freeTier) {
      console.log(`   Free Tier: ${config.freeTier}`);
    }

    if (config.paidTier) {
      console.log(`   Paid Tier: ${config.paidTier}`);
    }

    if (config.restrictions) {
      console.log(`   ${config.restrictions}`);
    }

    if (config.note) {
      console.log(`   ℹ️  ${config.note}`);
    }

    console.log(`   Docs: ${config.documentation}\n`);
  }
}

/**
 * Get API key status summary
 *
 * @returns Summary of configured and missing keys
 */
export function getAPIKeyStatus() {
  const required = Object.entries(API_KEY_MAPPING).filter(
    ([, config]) => config.required
  );
  const optional = Object.entries(API_KEY_MAPPING).filter(
    ([, config]) => !config.required
  );

  const requiredConfigured = required.filter(
    ([, config]) => !config.envVar || process.env[config.envVar]
  );
  const optionalConfigured = optional.filter(
    ([, config]) => !config.envVar || process.env[config.envVar]
  );

  return {
    total: Object.keys(API_KEY_MAPPING).length,
    required: {
      total: required.length,
      configured: requiredConfigured.length,
      missing: required.length - requiredConfigured.length,
    },
    optional: {
      total: optional.length,
      configured: optionalConfigured.length,
      missing: optional.length - optionalConfigured.length,
    },
    allRequiredConfigured: requiredConfigured.length === required.length,
  };
}
