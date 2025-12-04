/**
 * Configuration Type Definitions
 *
 * Defines interfaces for all configuration objects used throughout the application.
 * These types ensure type safety and provide IntelliSense support for configuration.
 */

// ============================================================================
// Tier Configuration
// ============================================================================

export type TierName = 'free' | 'basic' | 'premium';

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;

  /** Milliseconds to wait before testing the provider again (half-open state) */
  resetTimeout: number;

  /** Maximum concurrent requests allowed in half-open state */
  halfOpenMaxRequests: number;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed per minute */
  requestsPerMinute: number;

  /** Maximum requests allowed per day */
  requestsPerDay: number;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  /** Provider name (unique identifier) */
  name: string;

  /** Whether this provider is enabled */
  enabled: boolean;

  /** Priority level: 1 = primary, 2 = fallback, 3 = tertiary */
  priority: number;

  /** Base URL for API requests (if applicable) */
  baseUrl?: string;

  /** API key for authentication (if applicable) */
  apiKey?: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Number of retry attempts on failure */
  retryAttempts: number;

  /** Delay between retry attempts in milliseconds */
  retryDelay: number;

  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;

  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;

  /** Batch size for batch operations (if applicable) */
  batchSize?: number;
}

// ============================================================================
// AI Model Configuration
// ============================================================================

export type AIProvider = 'gemini' | 'groq' | 'openai';

export interface AIModelConfig {
  /** AI provider name */
  provider: AIProvider;

  /** Model identifier (e.g., 'gemini-1.5-flash-8b') */
  model: string;

  /** API endpoint URL */
  endpoint: string;

  /** API key for authentication */
  apiKey: string;

  /** Maximum tokens in response */
  maxTokens: number;

  /** Sampling temperature (0.0 - 1.0) */
  temperature: number;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Priority level: 1 = primary, 2 = fallback */
  priority: number;

  /** Fallback model configuration (if this model fails) */
  fallback?: AIModelConfig;

  /** Cost per token for budgeting */
  costPerToken: {
    input: number;
    output: number;
  };
}

// ============================================================================
// Cache Provider Configuration
// ============================================================================

export type CacheProviderType = 'vercel-kv' | 'upstash' | 'memory';

export interface CacheProviderConfig {
  /** Active cache provider type */
  type: CacheProviderType;

  /** Upstash Redis configuration (direct connection) */
  upstash: {
    priority: number;
    url?: string;
    token?: string;
  };

  /** Vercel KV configuration (Upstash managed by Vercel) */
  vercelKV: {
    priority: number;
    restUrl?: string;
    restToken?: string;
  };

  /** In-memory cache configuration (development only) */
  memory: {
    priority: number;
  };

  /** Fallback provider if primary fails */
  fallback: CacheProviderType;
}

// ============================================================================
// Cache TTL Configuration
// ============================================================================

export interface CacheTTLConfig {
  /** Stock quote cache TTL by tier (in milliseconds) */
  quotes: Record<TierName, number>;

  /** Commodity price cache TTL by tier (in milliseconds) */
  commodities: Record<TierName, number>;

  /** News article cache TTL by tier (in milliseconds) */
  news: Record<TierName, number>;

  /** SEC filing cache TTL by tier (in milliseconds) */
  filings: Record<TierName, number>;

  /** AI chat response cache TTL by tier (in milliseconds) */
  aiChat: Record<TierName, number>;

  /** Portfolio analysis cache TTL by tier (in milliseconds) */
  portfolioAnalysis: Record<TierName, number>;
}

// ============================================================================
// API Key Mapping
// ============================================================================

export interface APIKeyInfo {
  /** Environment variable name */
  envVar: string;

  /** Whether this API key is required for the app to function */
  required: boolean;

  /** Description of what this API key is used for */
  usage: string;

  /** Link to provider documentation */
  documentation: string;

  /** Free tier information */
  freeTier: string;

  /** Paid tier information (if applicable) */
  paidTier?: string;

  /** Usage restrictions or terms of service notes */
  restrictions?: string;

  /** Additional notes about this API key */
  note?: string;
}

// ============================================================================
// Validation Results
// ============================================================================

export interface ValidationResult {
  /** Whether validation passed */
  success: boolean;

  /** Critical errors that prevent the app from starting */
  errors: string[];

  /** Non-critical warnings */
  warnings: string[];

  /** Informational messages */
  info: string[];
}
