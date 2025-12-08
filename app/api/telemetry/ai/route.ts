/**
 * AI Telemetry API Route
 *
 * Provides AI usage statistics, cost tracking, and performance metrics.
 * Used by the Cost Tracking Dashboard.
 *
 * Endpoints:
 * - GET /api/telemetry/ai - Get AI telemetry stats (uses MVC controller)
 * - GET /api/telemetry/ai?export=true - Export logs as JSON
 * - POST /api/telemetry/ai/clear - Clear telemetry logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { telemetryController } from '@backend/modules/telemetry/telemetry.controller';
import { exportLogsAsJson, clearLogs } from '@lib/telemetry/ai-logger';
import { requireAdmin } from '@lib/auth/admin';
import { SuccessResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/telemetry/ai
 *
 * Query params:
 * - period: '1h' | '24h' | '7d' | '30d' (default: 24h)
 * - export: 'true' to export logs as JSON
 * 
 * Uses MVC controller pattern for data fetching
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const shouldExport = searchParams.get('export') === 'true';

  // Export logs if requested (legacy functionality)
  if (shouldExport) {
    const jsonLogs = exportLogsAsJson();
    return new NextResponse(jsonLogs, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ai-logs-${new Date().toISOString()}.json"`,
      },
    });
  }

  // Use controller for telemetry stats (MVC pattern)
  return telemetryController.getStats(req);
}

/**
 * POST /api/telemetry/ai/clear
 *
 * Clear all telemetry logs (admin only, use with caution)
 */
export async function POST(req: NextRequest) {
  // Require admin authorization
  const authError = await requireAdmin(req);
  if (authError) {
    return authError;
  }

  clearLogs();

  return NextResponse.json(
    SuccessResponse.create({ message: 'AI telemetry logs cleared' })
  );
}
