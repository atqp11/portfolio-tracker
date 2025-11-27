/**
 * Stock Controller
 *
 * Thin HTTP controller layer for stock operations.
 * Delegates business logic to StockService.
 */

import { stockService } from '@/lib/services/stock.service';
import { CreateStockInput, UpdateStockInput } from '@/lib/validators/schemas';

export class StockController {
  /**
   * Get all stocks for a portfolio (RLS enforced)
   */
  async getPortfolioStocks(portfolioId: string) {
    return stockService.findByPortfolioId(portfolioId);
  }

  /**
   * Get single stock by ID (RLS enforced)
   */
  async getStockById(stockId: string) {
    return stockService.findById(stockId);
  }

  /**
   * Create a new stock (RLS enforced)
   */
  async createStock(data: CreateStockInput) {
    return stockService.create(data);
  }

  /**
   * Update a stock (RLS enforced - ownership checked by Supabase)
   */
  async updateStock(stockId: string, data: UpdateStockInput) {
    return stockService.update(stockId, data);
  }

  /**
   * Delete a stock (RLS enforced - ownership checked by Supabase)
   */
  async deleteStock(stockId: string) {
    return stockService.delete(stockId);
  }
}

// Export singleton instance
export const stockController = new StockController();
