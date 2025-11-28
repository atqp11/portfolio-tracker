/**
 * API Route for Investment Theses
 *
 * This route file is intentionally kept thin. It acts as the entry point for thesis-related API calls
 * and delegates all logic to the ThesisController. It uses middleware wrappers for
 * centralized error handling and request validation.
 */
import { NextRequest } from 'next/server';
import { thesisController } from '@backend/modules/thesis/thesis.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { z } from 'zod';
import { commonSchemas, createThesisSchema, updateThesisSchema, updateThesisBodySchema } from '@/lib/validators/schemas';

// Define schemas for validation middleware
const getThesisQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
}).refine(data => data.id || data.portfolioId, {
  message: 'Either id or portfolioId must be provided.',
}).refine(data => !(data.id && data.portfolioId), {
  message: 'Cannot provide both id and portfolioId.',
});

const deleteThesisQuerySchema = z.object({
  id: commonSchemas.uuid,
});

/**
 * GET /api/thesis
 * Handles retrieving a single thesis by ID or all theses for a portfolio.
 */
export const GET = withErrorHandler(
  withValidation(undefined, getThesisQuerySchema)(
    (req: NextRequest, context: any) => thesisController.get(req, context)
  )
);

/**
 * POST /api/thesis
 * Handles creating a new investment thesis.
 */
export const POST = withErrorHandler(
  withValidation(createThesisSchema)(
    (req: NextRequest, context: any) => thesisController.create(req, context)
  )
);

/**
 * PUT /api/thesis
 * Handles updating an existing investment thesis.
 */
export const PUT = withErrorHandler(
  withValidation(updateThesisBodySchema)(
    (req: NextRequest, context: any) => thesisController.update(req, context)
  )
);

/**
 * DELETE /api/thesis
 * Handles deleting an investment thesis.
 */
export const DELETE = withErrorHandler(
  withValidation(undefined, deleteThesisQuerySchema)(
    (req: NextRequest, context: any) => thesisController.delete(req, context)
  )
);