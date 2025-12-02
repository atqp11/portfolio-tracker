/**
 * Portfolio Refresh API
 * 
 * Handles manual portfolio price refresh.
 * No quota tracking - refresh is unlimited for all tiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAuth } from '@backend/common/middleware/auth.middleware';

// Signal frontend to proceed with price refresh
async function handleRefresh(req: NextRequest, context: any) {
  return NextResponse.json({ success: true });
}

export const POST = withErrorHandler(
  withAuth(handleRefresh)
);
