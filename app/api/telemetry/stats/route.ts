import { NextResponse } from 'next/server';
import { getTelemetryStats } from '../../../../lib/metrics';

export async function GET() {
  try {
    const stats = getTelemetryStats();
    return NextResponse.json(stats);
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: 'Failed to get telemetry stats' }), { status: 500 });
  }
}
