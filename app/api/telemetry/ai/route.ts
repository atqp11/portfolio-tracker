/**
 * AI Telemetry API Route
 *
 * Provides AI usage statistics, cost tracking, and performance metrics.
 * Used by the Cost Tracking Dashboard.
 *
 * Endpoints:
 * - GET /api/telemetry/ai - Get AI telemetry stats
 * - GET /api/telemetry/ai/export - Export logs as JSON
 * - POST /api/telemetry/ai/clear - Clear telemetry logs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTelemetryStats,
  getAllLogs,
  exportLogsAsJson,
  clearLogs,
  checkMetricThresholds,
  type TelemetryStats,
} from '@lib/telemetry/ai-logger';
import { requireAdmin } from '@lib/auth/admin';
import { ErrorResponse, SuccessResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/telemetry/ai
 *
 * Query params:
 * - period: '1h' | '24h' | '7d' | '30d' (default: 24h)
 * - export: 'true' to export logs as JSON
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const period = searchParams.get('period') || '24h';
  const shouldExport = searchParams.get('export') === 'true';

  // Export logs if requested
  if (shouldExport) {
    const jsonLogs = exportLogsAsJson();
    return new NextResponse(jsonLogs, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ai-logs-${new Date().toISOString()}.json"`,
      },
    });
  }

  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '1h':
      startDate.setHours(startDate.getHours() - 1);
      break;
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setHours(startDate.getHours() - 24);
  }

  // Get telemetry stats
  const stats: TelemetryStats = getTelemetryStats(startDate, endDate);

  // Check metric thresholds
  const warnings = checkMetricThresholds(stats);

  // Get all logs for detailed analysis
  const recentLogs = getAllLogs()
    .filter((log) => log.timestamp >= startDate && log.timestamp <= endDate)
    .slice(-100); // Last 100 logs

  return NextResponse.json({
    period,
    stats,
    warnings,
    recentLogs,
  });
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
