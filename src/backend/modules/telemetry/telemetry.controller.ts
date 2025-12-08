/**
 * Telemetry Controller
 * 
 * MUST validate input using Zod schemas located in /zod.
 * MUST call service layer.
 * MUST return DTOs defined in /dto.
 * MUST NOT directly query DB.
 * MUST NOT implement business logic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { telemetryService } from './service/telemetry.service';
import { 
  getTelemetryStatsRequestSchema, 
  telemetryResponseSchema 
} from './zod/telemetry.schemas';
import type { TelemetryResponseDto, GetTelemetryStatsRequest } from './dto/telemetry.dto';

export class TelemetryController {
  /**
   * Get telemetry statistics (for pages and API routes)
   * 
   * Validates input with Zod, calls service, returns DTO.
   * Can be called from pages (returns DTO) or API routes (wraps in NextResponse).
   */
  async getTelemetryStats(params: GetTelemetryStatsRequest): Promise<TelemetryResponseDto> {
    // Validate input using Zod schema
    const validatedParams = getTelemetryStatsRequestSchema.parse(params);

    // Call service layer (business logic)
    const result = await telemetryService.getTelemetryStats(validatedParams.period);

    // Validate response with Zod (output guard)
    const validatedResponse = telemetryResponseSchema.parse(result);

    return validatedResponse;
  }

  /**
   * HTTP handler for API routes
   * 
   * Validates HTTP request, calls getTelemetryStats, returns NextResponse.
   */
  async getStats(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract query parameters
      const { searchParams } = new URL(request.url);
      const periodParam = searchParams.get('period') || '24h';

      // Call internal method (validates and returns DTO)
      const result = await this.getTelemetryStats({ period: periodParam as any });

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request parameters',
            details: error.issues,
          },
          { status: 400 }
        );
      }

      console.error('Error in telemetry controller:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
}

export const telemetryController = new TelemetryController();

