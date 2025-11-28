/**
 * Investment Thesis Service
 *
 * Business logic for managing investment theses.
 * Integrates with ThesisRepository for data access and ThesisValidator for input validation.
 * Handles error propagation and transforms data between database models and DTOs.
 */
import { BaseService } from '@backend/common/services/base.service';
import { thesisRepository, ThesisRepository } from '../repository/thesis.repository';
import { CreateThesisInput, UpdateThesisInput } from '@/lib/validators/schemas';
import { Database } from '@/lib/supabase/database.types';
import { ThesisValidator, thesisValidator } from '@/lib/validators/thesis.validator';
import { RepositoryError, RepositoryErrorType } from '@backend/common/repositories/types';
import { NotFoundError, ConflictError } from '@backend/common/middleware/error-handler.middleware'; // Using existing error classes

type InvestmentThesis = Database['public']['Tables']['investment_theses']['Row'];

export class ThesisService extends BaseService<InvestmentThesis, CreateThesisInput, UpdateThesisInput> {
  constructor(
    protected repository: ThesisRepository = thesisRepository,
    protected validator: ThesisValidator = thesisValidator // Inject the thesis-specific validator
  ) {
    super(repository, validator); // Pass repository and validator to BaseService
  }

  /**
   * Finds all investment theses associated with a specific portfolio.
   * Handles cases where the portfolio might not exist or have no theses.
   * @param portfolioId - The ID of the portfolio.
   * @returns A promise that resolves to an array of DTO-transformed theses.
   * @throws {NotFoundError} if no theses are found for the given portfolio.
   */
  async findByPortfolioId(portfolioId: string): Promise<any[]> {
    try {
      const theses = await this.repository.findByPortfolioId(portfolioId);
      if (!theses || theses.length === 0) {
        throw new NotFoundError(`No investment theses found for portfolio with ID: ${portfolioId}`);
      }
      return theses.map(thesis => this.transformToDTO(thesis));
    } catch (error) {
      // RepositoryError already handled in BaseRepository.
      // If it's a NotFoundError from a previous check, rethrow.
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`Error in ThesisService.findByPortfolioId for portfolio ${portfolioId}:`, error);
      throw error; // Re-throw other unexpected errors
    }
  }

  /**
   * Finds all investment theses for a given user.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to an array of DTO-transformed theses.
   */
  async findByUserId(userId: string): Promise<any[]> {
    try {
      const theses = await (this.repository as ThesisRepository).findByUserId(userId);
      return theses.map(thesis => this.transformToDTO(thesis));
    } catch (error) {
      console.error(`Error in ThesisService.findByUserId for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a single investment thesis by its ID.
   * @param id - The ID of the investment thesis.
   * @returns A promise that resolves to the DTO-transformed thesis.
   * @throws {NotFoundError} if the thesis is not found.
   */
  async findById(id: string): Promise<any> {
    try {
      const thesis = await super.findById(id);
      if (!thesis) {
        throw new NotFoundError(`Investment thesis with ID ${id} not found.`);
      }
      return this.transformToDTO(thesis);
    } catch (error) {
      if (error instanceof RepositoryError && error.type === RepositoryErrorType.NOT_FOUND) {
        throw new NotFoundError(`Investment thesis with ID ${id} not found.`);
      }
      // Re-throw if it's already a NotFoundError or another service error type
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      console.error(`Error in ThesisService.findById for thesis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new investment thesis after validation.
   * @param data - The data for the new thesis.
   * @returns A promise that resolves to the DTO-transformed new thesis.
   * @throws {ValidationError} if input data is invalid.
   * @throws {ConflictError} if a thesis with the same unique identifier already exists.
   */
  async create(data: CreateThesisInput): Promise<any> {
    try {
      // Validation is handled by BaseService using the injected ThesisValidator
      const newThesis = await super.create(data);
      return this.transformToDTO(newThesis);
    } catch (error) {
      if (error instanceof RepositoryError && error.type === RepositoryErrorType.DUPLICATE_KEY) {
        throw new ConflictError('Investment thesis with these details already exists.');
      }
      // Re-throw if it's already a ValidationError or other service error type
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      console.error('Error in ThesisService.create:', error);
      throw error;
    }
  }

  /**
   * Updates an existing investment thesis after validation.
   * @param id - The ID of the thesis to update.
   * @param data - The data to update the thesis with.
   * @returns A promise that resolves to the DTO-transformed updated thesis.
   * @throws {ValidationError} if input data is invalid.
   * @throws {NotFoundError} if the thesis to update is not found.
   */
  async update(id: string, data: UpdateThesisInput): Promise<any> {
    try {
      // First, check if the thesis exists to provide a more specific error
      await this.findById(id); // This will throw NotFoundError if not found

      // Validation is handled by BaseService using the injected ThesisValidator
      const updatedThesis = await super.update(id, data);
      return this.transformToDTO(updatedThesis);
    } catch (error) {
      if (error instanceof RepositoryError && error.type === RepositoryErrorType.NOT_FOUND) {
        throw new NotFoundError(`Investment thesis with ID ${id} not found.`);
      }
      // Re-throw if it's already a NotFoundError, ValidationError, or other service error type
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      console.error(`Error in ThesisService.update for thesis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes an investment thesis by its ID.
   * @param id - The ID of the thesis to delete.
   * @returns A promise that resolves when the thesis is successfully deleted.
   * @throws {NotFoundError} if the thesis to delete is not found.
   */
  async delete(id: string): Promise<void> {
    try {
      // First, check if the thesis exists to provide a more specific error
      await this.findById(id); // This will throw NotFoundError if not found

      await super.delete(id);
    } catch (error) {
      if (error instanceof RepositoryError && error.type === RepositoryErrorType.NOT_FOUND) {
        throw new NotFoundError(`Investment thesis with ID ${id} not found.`);
      }
      if (error instanceof NotFoundError) { // Re-throw if it's already a NotFoundError
        throw error;
      }
      console.error(`Error in ThesisService.delete for thesis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Transforms the snake_case database entity to a camelCase DTO.
   * @param thesis - The investment thesis entity from the database.
   * @returns A DTO with camelCase properties.
   */
  transformToDTO(thesis: InvestmentThesis): any {
    if (!thesis) {
      return thesis; // Or throw an error, depending on desired behavior for null input
    }
    return {
      id: thesis.id,
      portfolioId: thesis.portfolio_id,
      ticker: thesis.ticker,
      title: thesis.title,
      description: thesis.description,
      rationale: thesis.rationale,
      bearCase: thesis.bear_case,
      risks: thesis.risks,
      keyMetrics: thesis.key_metrics,
      stopLossRules: thesis.stop_loss_rules,
      exitCriteria: thesis.exit_criteria,
      thesisHealthScore: thesis.thesis_health_score,
      urgency: thesis.urgency,
      lastValidated: thesis.last_validated,
      validationHistory: thesis.validation_history,
      status: thesis.status,
      createdAt: thesis.created_at,
      updatedAt: thesis.updated_at,
    };
  }
}

export const thesisService = new ThesisService();
