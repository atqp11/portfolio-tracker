/**
 * Telemetry DTOs (Data Transfer Objects)
 * 
 * Define data shape for UI & controllers.
 * MUST use Zod for runtime validation.
 * MUST represent stable boundaries between backend ⇆ frontend.
 */

import type { z } from 'zod';
import type { 
  getTelemetryStatsRequestSchema,
  telemetryResponseSchema,
  telemetryStatsResponseSchema,
  telemetryPeriodSchema,
} from '../zod/telemetry.schemas';

/**
 * Type exports from Zod schemas
 */
export type TelemetryPeriod = z.infer<typeof telemetryPeriodSchema>;
// Input type allows partial (Zod will apply defaults)
export type GetTelemetryStatsRequest = z.input<typeof getTelemetryStatsRequestSchema>;
export type TelemetryResponseDto = z.infer<typeof telemetryResponseSchema>;
export type TelemetryStatsDto = z.infer<typeof telemetryStatsResponseSchema>;
