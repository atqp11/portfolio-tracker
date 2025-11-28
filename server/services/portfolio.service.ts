/**
 * Portfolio Service
 *
 * Business logic layer for portfolio operations.
 * Handles data transformation, validation, and business rules.
 */

import { portfolioRepository } from '@/server/repositories/portfolio.repository';
import { CreatePortfolioInput, UpdatePortfolioInput } from '@/lib/validators/schemas';
import { Database } from '@/lib/supabase/database.types';

type Portfolio = Database['public']['Tables']['portfolios']['Row'];

export class PortfolioService {
  /**
   * Get all portfolios for authenticated user
   */
  async findAll(options?: { includeRelations?: boolean }): Promise<any[]> {
    const portfolios = await portfolioRepository.findAll(options);
    return portfolios.map(p => this.transformToDTO(p));
  }

  /**
   * Get single portfolio by ID
   */
  async findById(portfolioId: string, options?: { includeRelations?: boolean }): Promise<any> {
    const portfolio = await portfolioRepository.findById(portfolioId, options);

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    return this.transformToDTO(portfolio);
  }

  /**
   * Create a new portfolio
   * Applies business rules and transforms DTO to database model
   */
  async create(data: CreatePortfolioInput): Promise<any> {
    // Transform DTO (camelCase) to database model (snake_case)
    const portfolioData = this.transformCreateDTO(data);

    // Apply business rules
    this.validateCreateData(portfolioData);

    const portfolio = await portfolioRepository.create(portfolioData);
    return this.transformToDTO(portfolio);
  }

  /**
   * Update an existing portfolio
   * Applies business rules and transforms DTO to database model
   */
  async update(portfolioId: string, data: UpdatePortfolioInput): Promise<any> {
    // Verify portfolio exists
    await this.findById(portfolioId);

    // Transform DTO to database model
    const updateData = this.transformUpdateDTO(data);

    // Apply business rules
    this.validateUpdateData(updateData);

    const portfolio = await portfolioRepository.update(portfolioId, updateData);
    return this.transformToDTO(portfolio);
  }

  /**
   * Delete a portfolio
   */
  async delete(portfolioId: string): Promise<{ success: boolean }> {
    // Verify portfolio exists
    await this.findById(portfolioId);

    await portfolioRepository.delete(portfolioId);
    return { success: true };
  }

  /**
   * Check if user owns portfolio
   */
  async isOwner(portfolioId: string): Promise<boolean> {
    return portfolioRepository.isOwner(portfolioId);
  }

  /**
   * Transform create DTO from camelCase to snake_case
   */
  private transformCreateDTO(data: CreatePortfolioInput) {
    return {
      name: data.name,
      type: data.type,
      initial_value: data.initialValue,
      target_value: data.targetValue || 0,
      borrowed_amount: data.borrowedAmount || 0,
      margin_call_level: data.marginCallLevel || 30,
    };
  }

  /**
   * Transform update DTO from camelCase to snake_case
   */
  private transformUpdateDTO(data: UpdatePortfolioInput) {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.initialValue !== undefined) updateData.initial_value = data.initialValue;
    if (data.targetValue !== undefined) updateData.target_value = data.targetValue;
    if (data.borrowedAmount !== undefined) updateData.borrowed_amount = data.borrowedAmount;
    if (data.marginCallLevel !== undefined) updateData.margin_call_level = data.marginCallLevel;

    return updateData;
  }

  /**
   * Validate create data (business rules)
   */
  private validateCreateData(data: any): void {
    // Business rule: margin call level should be between 0 and 100
    if (data.margin_call_level < 0 || data.margin_call_level > 100) {
      throw new Error('Margin call level must be between 0 and 100');
    }

    // Business rule: initial value should be positive
    if (data.initial_value < 0) {
      throw new Error('Initial value must be positive');
    }

    // Business rule: borrowed amount cannot exceed initial value
    if (data.borrowed_amount > data.initial_value) {
      throw new Error('Borrowed amount cannot exceed initial value');
    }
  }

  /**
   * Validate update data (business rules)
   */
  private validateUpdateData(data: any): void {
    if (data.margin_call_level !== undefined) {
      if (data.margin_call_level < 0 || data.margin_call_level > 100) {
        throw new Error('Margin call level must be between 0 and 100');
      }
    }

    if (data.initial_value !== undefined && data.initial_value < 0) {
      throw new Error('Initial value must be positive');
    }
  }

  /**
   * Transform database model (snake_case) to DTO (camelCase)
   */
  private transformToDTO(portfolio: any): any {
    if (!portfolio) return portfolio;

    return {
      id: portfolio.id,
      userId: portfolio.user_id,
      name: portfolio.name,
      type: portfolio.type,
      initialValue: portfolio.initial_value,
      targetValue: portfolio.target_value,
      borrowedAmount: portfolio.borrowed_amount,
      marginCallLevel: portfolio.margin_call_level,
      createdAt: portfolio.created_at,
      updatedAt: portfolio.updated_at,
      // Pass through any relations if they exist
      ...(portfolio.stocks && { stocks: portfolio.stocks }),
      ...(portfolio.investment_theses && { investmentTheses: portfolio.investment_theses }),
      ...(portfolio.daily_checklists && { dailyChecklists: portfolio.daily_checklists }),
    };
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
