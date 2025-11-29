/**
 * API Route for Checklist Tasks
 *
 * This route delegates all logic to the TaskController and uses middleware
 * for error handling and validation.
 */
import { NextRequest } from 'next/server';
import { taskController } from '@backend/modules/tasks/task.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { z } from 'zod';
import { commonSchemas, createTaskSchema, updateTaskSchema } from '@lib/validators/schemas';

// Schemas for validation middleware
const getTaskQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  checklistId: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
}).refine(data => data.id || data.checklistId || data.portfolioId, {
  message: 'Either id, checklistId, or portfolioId must be provided.',
});

const idQuerySchema = z.object({
  id: commonSchemas.uuid,
});


/**
 * GET /api/tasks
 * Handles retrieving tasks.
 */
export const GET = withErrorHandler(
  withValidation(undefined, getTaskQuerySchema)(
    (req: NextRequest, context: any) => taskController.get(req, context)
  )
);

/**
 * POST /api/tasks
 * Handles creating a new task.
 */
export const POST = withErrorHandler(
  withValidation(createTaskSchema)(
    (req: NextRequest, context: any) => taskController.create(req, context)
  )
);

/**
 * PUT /api/tasks
 * Handles updating an existing task.
 */
export const PUT = withErrorHandler(
  withValidation(updateTaskSchema, idQuerySchema)(
    (req: NextRequest, context: any) => taskController.update(req, context)
  )
);

/**
 * DELETE /api/tasks
 * Handles deleting a task.
 */
export const DELETE = withErrorHandler(
  withValidation(undefined, idQuerySchema)(
    (req: NextRequest, context: any) => taskController.delete(req, context)
  )
);