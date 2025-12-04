/**
 * Data Source Orchestrator - Public API
 *
 * Exports all public interfaces, classes, and utilities for the
 * Data Source Orchestrator system.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type {
  DataProvider,
  BatchDataProvider,
  FetchOptions,
  DataResult,
  BatchDataResult,
  MergeStrategy,
  OrchestratorFetchOptions,
  MergeFetchOptions,
} from './types';

export {
  ProviderErrorCode,
  ProviderError,
  CircuitOpenError,
  AllProvidersFailedError,
  ProviderTimeoutError,
} from './types';

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export {
  CircuitState,
  CircuitBreaker,
  CircuitBreakerManager,
} from './circuit-breaker';

export type { CircuitBreakerStats } from './circuit-breaker';

// ============================================================================
// REQUEST DEDUPLICATION
// ============================================================================

export { RequestDeduplicationManager } from './deduplication';

// ============================================================================
// TELEMETRY
// ============================================================================

export { TelemetryLogger } from './telemetry';

export type {
  TelemetryEvent,
  TelemetryStats,
} from './telemetry';

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export { DataSourceOrchestrator } from './orchestrator';

// ============================================================================
// RE-EXPORTS (future modules will be added here)
// ============================================================================

// Provider Adapters (Phase 3)
// export * from './provider-adapters';
