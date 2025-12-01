/**
 * Portfolio Controller
 *
 * HTTP controller for portfolio operations.
 * Handles request/response formatting and delegates to PortfolioService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import { CreatePortfolioInput, UpdatePortfolioInput, commonSchemas } from '@lib/validators/schemas';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// Schema for GET query parameters
const getPortfolioQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  include: z.enum(['true', 'false']).optional(),
});

// Schema for DELETE query parameters
const deletePortfolioQuerySchema = z.object({
  id: commonSchemas.uuid,
});

export class PortfolioController {
  /**
   * GET - Get portfolios (all or by ID)
   */
  async get(request: NextRequest, { query }: { query: z.infer<typeof getPortfolioQuerySchema> }) {
    const includeRelations = query.include === 'true';

    if (query.id) {
      const portfolio = await portfolioService.findById(query.id, { includeRelations });
      return NextResponse.json({ success: true, data: portfolio });
    } else {
      const portfolios = await portfolioService.findAll({ includeRelations });
      return NextResponse.json({ success: true, data: portfolios });
    }
  }

  /**
   * POST - Create a new portfolio
   */
  async create(request: NextRequest, { body }: { body: CreatePortfolioInput }) {
    const portfolio = await portfolioService.create(body);
    return NextResponse.json({ success: true, data: portfolio }, { status: 201 });
  }

  /**
   * PUT - Update a portfolio
   */
  async update(request: NextRequest, { query, body }: { query: { id: string }, body: UpdatePortfolioInput }) {
    const { id } = query;
    if (!id) {
      throw new NotFoundError('Portfolio ID is required as a query parameter.');
    }
    const portfolio = await portfolioService.update(id, body);
    return NextResponse.json({ success: true, data: portfolio });
  }

  /**
   * DELETE - Delete a portfolio
   */
  async delete(request: NextRequest, { query }: { query: z.infer<typeof deletePortfolioQuerySchema> }) {
    await portfolioService.delete(query.id);
    return new NextResponse(null, { status: 204 });
  }

  // Legacy methods for backward compatibility (used by news route)
  async getUserPortfolios(includeRelations: boolean = false) {
    return portfolioService.findAll({ includeRelations });
  }

  async getPortfolioById(portfolioId: string) {
    return portfolioService.findById(portfolioId, { includeRelations: true });
  }

  async createPortfolio(data: CreatePortfolioInput) {
    return portfolioService.create(data);
  }

  async updatePortfolio(portfolioId: string, data: UpdatePortfolioInput) {
    return portfolioService.update(portfolioId, data);
  }

  async deletePortfolio(portfolioId: string) {
    return portfolioService.delete(portfolioId);
  }
}

// Export singleton instance
export const portfolioController = new PortfolioController();