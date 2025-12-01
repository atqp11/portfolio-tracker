/**
 * AI Chat API Route
 *
 * Thin route handler that delegates to AIController.
 * Follows MVC pattern: Route → Controller → Service → AI Provider
 *
 * Pipeline:
 * 1. Validate request (Zod schema in controller)
 * 2. Check cache (service layer)
 * 3. Check quota (controller/middleware)
 * 4. Route to AI model (service → confidence router)
 * 5. Cache response (service)
 * 6. Log telemetry (service)
 */

import { NextRequest } from 'next/server';
import { aiController } from '@backend/modules/ai/ai.controller';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/chat
 * Process chat message with AI
 */
export async function POST(req: NextRequest) {
  return aiController.chat(req);
}

/**
 * GET /api/ai/chat/stats
 * Get chat statistics and telemetry
 */
export async function GET(req: NextRequest) {
  return aiController.getStats(req);
}
