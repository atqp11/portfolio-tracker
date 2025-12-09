/**
 * Admin Waitlist API Route
 *
 * Admin-only endpoints to manage waitlist entries.
 * Uses MVC pattern with middleware stack:
 * - withErrorHandler: Global error handling
 * - withAdmin: Admin authorization
 * - withValidation: Request validation with Zod schemas
 * - Controller: HTTP concerns (delegates to service layer)
 */

import { NextRequest } from 'next/server';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAdmin } from '@backend/common/middleware/auth.middleware';
import * as waitlistController from '@backend/modules/waitlist/waitlist.controller';
import {
  listWaitlistQuerySchema,
  deleteWaitlistSchema,
  updateWaitlistStatusSchema,
} from '@backend/modules/waitlist/dto/waitlist.dto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/waitlist
 *
 * List all waitlist entries with pagination and filtering
 */
export const GET = withErrorHandler(
  withAdmin(
    withValidation(listWaitlistQuerySchema, undefined)(
      waitlistController.listWaitlistEntries
    )
  )
);

/**
 * DELETE /api/admin/waitlist
 *
 * Remove a waitlist entry by ID (pass { id: "..." } in body)
 */
export const DELETE = withErrorHandler(
  withAdmin(
    withValidation(deleteWaitlistSchema, undefined)(
      waitlistController.deleteWaitlistEntry
    )
  )
);

/**
 * PATCH /api/admin/waitlist
 *
 * Mark waitlist entries as notified (pass { ids: [...], notified: true/false })
 */
export const PATCH = withErrorHandler(
  withAdmin(
    withValidation(updateWaitlistStatusSchema, undefined)(
      waitlistController.updateWaitlistNotificationStatus
    )
  )
);
