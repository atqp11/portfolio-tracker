/**
 * AI Model Configuration
 *
 * Tier-Based Model Selection:
 * - Free: Cheapest models (Gemini Flash 8B)
 * - Basic: Balanced performance (Gemini Flash)
 * - Premium: Best quality (Gemini Pro)
 *
 * Task-Specific Overrides:
 * - Sentiment: Fast, cheap model (Groq Llama)
 * - Summarization: Balanced (Gemini Flash)
 * - Complex Analysis: High quality (Gemini Pro)
 */

import type { AIModelConfig } from './types';

export const AI_MODEL_CONFIG = {
  // ========================================
  // TIER-BASED MODEL SELECTION
  // ========================================

  tierModels: {
    free: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash-8b',
      priority: 1, // PRIMARY for free tier
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 30000,
      costPerToken: {
        input: 0.0001,   // $0.10 per 1M tokens
        output: 0.0003,  // $0.30 per 1M tokens
      },
      fallback: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        priority: 2, // FALLBACK
        endpoint: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        maxTokens: 1024,
        temperature: 0.7,
        timeout: 20000,
        costPerToken: {
          input: 0.0004,
          output: 0.0008,
        },
      },
    },

    basic: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash',
      priority: 1, // PRIMARY for basic tier
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 2048,
      temperature: 0.7,
      timeout: 40000,
      costPerToken: {
        input: 0.00015,  // $0.15 per 1M tokens
        output: 0.0006,  // $0.60 per 1M tokens
      },
      fallback: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        priority: 2,
        endpoint: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 20000,
        costPerToken: {
          input: 0.0004,
          output: 0.0008,
        },
      },
    },

    premium: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-pro',
      priority: 1, // PRIMARY for premium tier
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 60000,
      costPerToken: {
        input: 0.00125,  // $1.25 per 1M tokens
        output: 0.005,   // $5.00 per 1M tokens
      },
      fallback: {
        provider: 'gemini' as const,
        model: 'gemini-1.5-flash',
        priority: 2,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY!,
        maxTokens: 2048,
        temperature: 0.7,
        timeout: 40000,
        costPerToken: {
          input: 0.00015,
          output: 0.0006,
        },
      },
    },
  },

  // ========================================
  // TASK-SPECIFIC MODEL OVERRIDES
  // ========================================

  taskModels: {
    // Fast, cheap sentiment analysis
    sentiment: {
      provider: 'groq' as const,
      model: 'llama-3.3-70b-versatile',
      priority: 1,
      endpoint: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY!,
      maxTokens: 512,
      temperature: 0.3, // Lower for consistency
      timeout: 20000,
      costPerToken: {
        input: 0.0004,
        output: 0.0008,
      },
      fallback: {
        provider: 'gemini' as const,
        model: 'gemini-1.5-flash-8b',
        priority: 2,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY!,
        maxTokens: 512,
        temperature: 0.3,
        timeout: 30000,
        costPerToken: {
          input: 0.0001,
          output: 0.0003,
        },
      },
    },

    // Balanced summarization
    summarization: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash',
      priority: 1,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 1024,
      temperature: 0.5,
      timeout: 40000,
      costPerToken: {
        input: 0.00015,
        output: 0.0006,
      },
      fallback: {
        provider: 'gemini' as const,
        model: 'gemini-1.5-flash-8b',
        priority: 2,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY!,
        maxTokens: 1024,
        temperature: 0.5,
        timeout: 30000,
        costPerToken: {
          input: 0.0001,
          output: 0.0003,
        },
      },
    },

    // High-quality complex analysis
    complexAnalysis: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-pro',
      priority: 1,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 60000,
      costPerToken: {
        input: 0.00125,
        output: 0.005,
      },
      fallback: {
        provider: 'gemini' as const,
        model: 'gemini-1.5-flash',
        priority: 2,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY!,
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 40000,
        costPerToken: {
          input: 0.00015,
          output: 0.0006,
        },
      },
    },
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get AI model configuration for a user tier
 * Optionally override with task-specific settings
 *
 * @param tier - User tier (free, basic, premium)
 * @param task - Optional task type for specialized models
 * @returns AI model configuration
 *
 * @example
 * ```ts
 * // Get default model for free tier
 * const config = getAIModelConfig('free');
 *
 * // Get sentiment analysis model (overrides tier default)
 * const sentimentConfig = getAIModelConfig('free', 'sentiment');
 * ```
 */
export function getAIModelConfig(
  tier: 'free' | 'basic' | 'premium',
  task?: keyof typeof AI_MODEL_CONFIG.taskModels
): AIModelConfig {
  const tierConfig = AI_MODEL_CONFIG.tierModels[tier];

  if (task && AI_MODEL_CONFIG.taskModels[task]) {
    // Merge tier config with task overrides
    return {
      ...tierConfig,
      ...AI_MODEL_CONFIG.taskModels[task],
    } as AIModelConfig;
  }

  return tierConfig;
}

/**
 * Estimate cost for a specific AI request
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param tier - User tier
 * @param task - Optional task type
 * @returns Estimated cost in USD
 *
 * @example
 * ```ts
 * const cost = estimateCost(1000, 500, 'free');
 * console.log(`Estimated cost: $${cost.toFixed(4)}`);
 * ```
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  tier: 'free' | 'basic' | 'premium',
  task?: keyof typeof AI_MODEL_CONFIG.taskModels
): number {
  const config = getAIModelConfig(tier, task);
  const inputCost = (inputTokens / 1000) * config.costPerToken.input;
  const outputCost = (outputTokens / 1000) * config.costPerToken.output;
  return inputCost + outputCost;
}

/**
 * Get all available AI providers
 *
 * @returns Array of unique provider names
 */
export function getAIProviders(): string[] {
  const providers = new Set<string>();

  // Add tier model providers
  Object.values(AI_MODEL_CONFIG.tierModels).forEach(config => {
    providers.add(config.provider);
    if (config.fallback) {
      providers.add(config.fallback.provider);
    }
  });

  // Add task model providers
  Object.values(AI_MODEL_CONFIG.taskModels).forEach(config => {
    providers.add(config.provider);
  });

  return Array.from(providers);
}
