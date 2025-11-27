/**
 * Portfolio Controller
 *
 * Thin HTTP controller layer for portfolio operations.
 * Delegates business logic to PortfolioService.
 */

import { portfolioService } from '@/lib/services/portfolio.service';
import { CreatePortfolioInput, UpdatePortfolioInput } from '@/lib/validators/schemas';

export class PortfolioController {
  /**
   * Get all portfolios for authenticated user (RLS enforced)
   */
  async getUserPortfolios(includeRelations: boolean = false) {
    return portfolioService.findAll({ includeRelations });
  }

  /**
   * Get single portfolio by ID (RLS enforced)
   */
  async getPortfolioById(portfolioId: string) {
    return portfolioService.findById(portfolioId, { includeRelations: true });
  }

  /**
   * Create a new portfolio (RLS enforced)
   */
  async createPortfolio(data: CreatePortfolioInput) {
    return portfolioService.create(data);
  }

  /**
   * Update a portfolio (RLS enforced - ownership checked by Supabase)
   */
  async updatePortfolio(portfolioId: string, data: UpdatePortfolioInput) {
    return portfolioService.update(portfolioId, data);
  }

  /**
   * Delete a portfolio (RLS enforced - ownership checked by Supabase)
   */
  async deletePortfolio(portfolioId: string) {
    return portfolioService.delete(portfolioId);
  }
}

// Export singleton instance
export const portfolioController = new PortfolioController();
