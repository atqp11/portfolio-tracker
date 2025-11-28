/**
 * API Route for Stocks
 *
 * This route delegates all logic to the StockController and uses middleware
 * for error handling and validation.
 */
import { NextRequest } from 'next/server';
import { stockController } from '@/server/controllers/stock.controller';
import { withErrorHandler } from '@/server/middleware/error-handler.middleware';
import { withValidation } from '@/server/middleware/validation.middleware';
import { z } from 'zod';
import { commonSchemas, createStockSchema, updateStockSchema } from '@/lib/validators/schemas';

// Schemas for validation middleware
const getStockQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
}).refine(data => data.id || data.portfolioId, {
  message: 'Either id or portfolioId must be provided.',
});

const deleteStockQuerySchema = z.object({
  id: commonSchemas.uuid,
});

const updateStockBodySchema = updateStockSchema.extend({
    id: commonSchemas.uuid,
});

/**
 * GET /api/stocks
 * Handles retrieving stocks.
 */
export const GET = withErrorHandler(
  withValidation(undefined, getStockQuerySchema)(
    (req: NextRequest, context: any) => stockController.get(req, context)
  )
);

/**
 * POST /api/stocks
 * Handles creating a new stock.
 */
export const POST = withErrorHandler(
  withValidation(createStockSchema)(
    (req: NextRequest, context: any) => stockController.create(req, context)
  )
);

/**
 * PUT /api/stocks
 * Handles updating an existing stock.
 */
export const PUT = withErrorHandler(
  withValidation(updateStockBodySchema)(
    (req: NextRequest, context: any) => stockController.update(req, context)
  )
);

/**
 * DELETE /api/stocks
 * Handles deleting a stock.
 */
export const DELETE = withErrorHandler(
  withValidation(undefined, deleteStockQuerySchema)(
    (req: NextRequest, context: any) => stockController.delete(req, context)
  )
);