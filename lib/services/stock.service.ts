/**
 * Stock Service
 *
 * Business logic layer for stock operations.
 * Handles data transformation, validation, and business rules.
 */

import { stockRepository } from '@/lib/repositories/stock.repository';
import { CreateStockInput, UpdateStockInput } from '@/lib/validators/schemas';
import { Database } from '@/lib/supabase/database.types';

type Stock = Database['public']['Tables']['stocks']['Row'];

export class StockService {
  /**
   * Get all stocks for a portfolio
   */
  async findByPortfolioId(portfolioId: string): Promise<any[]> {
    const stocks = await stockRepository.findByPortfolioId(portfolioId);
    return stocks.map(stock => this.transformToDTO(stock));
  }

  /**
   * Get single stock by ID
   */
  async findById(stockId: string): Promise<any> {
    const stock = await stockRepository.findById(stockId);

    if (!stock) {
      throw new Error('Stock not found');
    }

    return this.transformToDTO(stock);
  }

  /**
   * Create a new stock
   * Applies business rules and transforms DTO to database model
   */
  async create(data: CreateStockInput): Promise<any> {
    // Transform DTO and apply business logic
    const stockData = this.transformCreateDTO(data);

    // Validate business rules
    this.validateCreateData(stockData);

    const stock = await stockRepository.create(stockData);
    return this.transformToDTO(stock);
  }

  /**
   * Update an existing stock
   * Applies business rules and transforms DTO to database model
   */
  async update(stockId: string, data: UpdateStockInput): Promise<any> {
    // Get existing stock for calculations (already transformed to DTO)
    const existingStockDTO = await this.findById(stockId);

    // Get raw stock for repository operations
    const existingStock = await stockRepository.findById(stockId);
    if (!existingStock) {
      throw new Error('Stock not found');
    }

    // Transform DTO to database model
    const updateData = await this.transformUpdateDTO(data, existingStock);

    // Validate business rules
    this.validateUpdateData(updateData);

    const stock = await stockRepository.update(stockId, updateData);
    return this.transformToDTO(stock);
  }

  /**
   * Delete a stock
   */
  async delete(stockId: string): Promise<{ success: boolean }> {
    // Verify stock exists
    await this.findById(stockId);

    await stockRepository.delete(stockId);
    return { success: true };
  }

  /**
   * Transform create DTO from camelCase to snake_case
   * Applies business logic for calculated fields
   */
  private transformCreateDTO(data: CreateStockInput) {
    // Business logic: calculate actual_value
    const actualValue = data.currentPrice
      ? data.shares * data.currentPrice
      : data.shares * data.avgPrice;

    return {
      portfolio_id: data.portfolioId,
      symbol: data.symbol.toUpperCase(), // Business rule: symbols are uppercase
      name: data.name,
      shares: data.shares,
      avg_price: data.avgPrice,
      current_price: data.currentPrice ?? null,
      actual_value: actualValue,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Transform update DTO from camelCase to snake_case
   * Recalculates actual_value if relevant fields changed
   */
  private async transformUpdateDTO(data: UpdateStockInput, existingStock: Stock) {
    const updateData: any = {
      last_updated: new Date().toISOString(),
    };

    if (data.symbol !== undefined) {
      updateData.symbol = data.symbol.toUpperCase(); // Business rule: symbols are uppercase
    }
    if (data.name !== undefined) updateData.name = data.name;
    if (data.shares !== undefined) updateData.shares = data.shares;
    if (data.avgPrice !== undefined) updateData.avg_price = data.avgPrice;
    if (data.currentPrice !== undefined) updateData.current_price = data.currentPrice;

    // Business logic: Recalculate actual_value if shares or price changed
    if (data.shares !== undefined || data.currentPrice !== undefined) {
      const shares = data.shares ?? existingStock.shares;
      const price = data.currentPrice ?? existingStock.current_price ?? existingStock.avg_price;
      updateData.actual_value = shares * price;
    }

    return updateData;
  }

  /**
   * Validate create data (business rules)
   */
  private validateCreateData(data: any): void {
    // Business rule: shares must be positive
    if (data.shares <= 0) {
      throw new Error('Shares must be greater than zero');
    }

    // Business rule: prices must be positive
    if (data.avg_price <= 0) {
      throw new Error('Average price must be greater than zero');
    }

    if (data.current_price !== null && data.current_price <= 0) {
      throw new Error('Current price must be greater than zero');
    }

    // Business rule: symbol should not be empty
    if (!data.symbol || data.symbol.trim().length === 0) {
      throw new Error('Stock symbol is required');
    }
  }

  /**
   * Validate update data (business rules)
   */
  private validateUpdateData(data: any): void {
    if (data.shares !== undefined && data.shares <= 0) {
      throw new Error('Shares must be greater than zero');
    }

    if (data.avg_price !== undefined && data.avg_price <= 0) {
      throw new Error('Average price must be greater than zero');
    }

    if (data.current_price !== undefined && data.current_price !== null && data.current_price <= 0) {
      throw new Error('Current price must be greater than zero');
    }

    if (data.symbol !== undefined && (!data.symbol || data.symbol.trim().length === 0)) {
      throw new Error('Stock symbol is required');
    }
  }

  /**
   * Transform database model (snake_case) to DTO (camelCase)
   */
  private transformToDTO(stock: Stock): any {
    if (!stock) return stock;

    return {
      id: stock.id,
      portfolioId: stock.portfolio_id,
      symbol: stock.symbol,
      name: stock.name,
      shares: stock.shares,
      avgPrice: stock.avg_price,
      currentPrice: stock.current_price,
      previousPrice: stock.previous_price, // Ensure previous_price is included
      actualValue: stock.actual_value,
      lastUpdated: stock.last_updated, // Use last_updated instead of updated_at
      createdAt: stock.created_at,
    };
  }
}

// Export singleton instance
export const stockService = new StockService();
