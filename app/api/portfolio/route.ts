/**
 * Portfolio API Routes
 *
 * CRUD operations for portfolios with auth and validation.
 * Uses middleware pattern consistent with other CRUD entities.
 */

import { NextRequest } from 'next/server';
import { portfolioController } from '@backend/modules/portfolio/portfolio.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withPortfolioQuota } from '@backend/common/middleware/quota.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAuth } from '@backend/common/middleware/auth.middleware';
import { z } from 'zod';
import { commonSchemas, createPortfolioSchema, updatePortfolioSchema } from '@lib/validators/schemas';

export const dynamic = 'force-dynamic';

// Schemas for query parameter validation
const getPortfolioQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  include: z.enum(['true', 'false']).optional(),
});

const deletePortfolioQuerySchema = z.object({
  id: commonSchemas.uuid,
});

const updatePortfolioQuerySchema = z.object({
  id: commonSchemas.uuid,
});

/**
 * GET /api/portfolio
 * Get all portfolios or a specific portfolio by ID
 */
export const GET = withErrorHandler(
  withAuth(
    withValidation(undefined, getPortfolioQuerySchema)(
      (req: NextRequest, context: any) => portfolioController.get(req, context)
    )
  )
);

/**
 * POST /api/portfolio
 * Create a new portfolio
 */
export const POST = withErrorHandler(
  withAuth(
    withPortfolioQuota(
      withValidation(createPortfolioSchema)(
        (req: NextRequest, context: any) => portfolioController.create(req, context)
      )
    )
  )
);

/**
 * PUT /api/portfolio
 * Update an existing portfolio
 */
export const PUT = withErrorHandler(
  withAuth(
    withValidation(updatePortfolioSchema, updatePortfolioQuerySchema)(
      (req: NextRequest, context: any) => portfolioController.update(req, context)
    )
  )
);

/**
 * DELETE /api/portfolio
 * Delete a portfolio
 */
export const DELETE = withErrorHandler(
  withAuth(
    withValidation(undefined, deletePortfolioQuerySchema)(
      (req: NextRequest, context: any) => portfolioController.delete(req, context)
    )
  )
);
