/**
 * API Route for Daily Checklists
 *
 * This route file delegates all logic to the ChecklistController, using middleware
 * for error handling, auth, and validation to keep it lean.
 */
import { NextRequest } from 'next/server';
import { checklistController } from '@backend/modules/checklist/checklist.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAuth } from '@backend/common/middleware/auth.middleware';
import { z } from 'zod';
import { commonSchemas, createDailyChecklistSchema, updateDailyChecklistSchema, updateChecklistBodySchema } from '@lib/validators/schemas';

// Schemas for validation middleware
const getChecklistQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
  date: z.string().datetime().optional(),
}).refine(data => data.id || data.portfolioId, {
  message: 'Either id or portfolioId must be provided.',
});

const deleteChecklistQuerySchema = z.object({
  id: commonSchemas.uuid,
});

/**
 * GET /api/checklist
 * Handles retrieving checklists.
 */
export const GET = withErrorHandler(
  withAuth(
    withValidation(undefined, getChecklistQuerySchema)(
      (req: NextRequest, context: any) => checklistController.get(req, context)
    )
  )
);

/**
 * POST /api/checklist
 * Handles creating a new daily checklist.
 */
export const POST = withErrorHandler(
  withAuth(
    withValidation(createDailyChecklistSchema)(
      (req: NextRequest, context: any) => checklistController.create(req, context)
    )
  )
);

/**
 * PUT /api/checklist
 * Handles updating an existing daily checklist.
 */
export const PUT = withErrorHandler(
  withAuth(
    withValidation(updateChecklistBodySchema)(
      (req: NextRequest, context: any) => checklistController.update(req, context)
    )
  )
);

/**
 * DELETE /api/checklist
 * Handles deleting a daily checklist.
 */
export const DELETE = withErrorHandler(
  withAuth(
    withValidation(undefined, deleteChecklistQuerySchema)(
      (req: NextRequest, context: any) => checklistController.delete(req, context)
    )
  )
);