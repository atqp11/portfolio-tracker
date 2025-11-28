/**
 * Daily Checklist Service
 *
 * Handles business logic for managing daily checklists and their associated tasks.
 */
import { BaseService } from './base/base.service';
import { checklistRepository, ChecklistRepository } from '@/lib/repositories/checklist.repository';
import { CreateDailyChecklistInput, UpdateDailyChecklistInput } from '@/lib/validators/schemas';
import { Database } from '@/lib/supabase/database.types';
import { ChecklistValidator, checklistValidator } from '@/lib/validators/checklist.validator';
import { RepositoryError, RepositoryErrorType } from '@/lib/repositories/base/types';
import { NotFoundError, ConflictError } from '@/lib/middleware/error-handler.middleware';

type DailyChecklist = Database['public']['Tables']['daily_checklists']['Row'];

export class ChecklistService extends BaseService<DailyChecklist, CreateDailyChecklistInput, UpdateDailyChecklistInput> {
  constructor(
    protected repository: ChecklistRepository = checklistRepository,
    protected validator: ChecklistValidator = checklistValidator
  ) {
    super(repository, validator);
  }

  // --- Checklist Methods ---

  /**
   * Retrieves a single checklist by its ID, including tasks.
   * @param id The ID of the checklist.
   */
  async findChecklistById(id: string): Promise<any> {
    try {
      const checklist = await this.repository.findByIdWithTasks(id);
      if (!checklist) {
        throw new NotFoundError(`Checklist with ID ${id} not found.`);
      }
      return this.transformChecklistToDTO(checklist);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error(`Error in ChecklistService.findChecklistById for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves checklists for a portfolio, with optional date filtering.
   * @param portfolioId The ID of the portfolio.
   * @param date Optional specific date for the checklist.
   */
  async findChecklistsByPortfolio(portfolioId: string, date?: string): Promise<any> {
    try {
      if (date) {
        const checklist = await this.repository.findByPortfolioIdAndDate(portfolioId, new Date(date));
        if (!checklist) {
          throw new NotFoundError(`Checklist for portfolio ${portfolioId} on date ${date} not found.`);
        }
        return this.transformChecklistToDTO(checklist);
      } else {
        const checklists = await this.repository.findLatestByPortfolioId(portfolioId);
        return checklists.map(c => this.transformChecklistToDTO(c));
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error(`Error in ChecklistService.findChecklistsByPortfolio for portfolio ${portfolioId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new daily checklist.
   * @param data The data for the new checklist.
   */
  async createChecklist(data: CreateDailyChecklistInput): Promise<any> {
    this.validator.validateCreateChecklist(data);
    try {
      const repositoryData = this.transformCreateDTO(data);
      const newChecklist = await this.repository.create(repositoryData);
      return this.transformChecklistToDTO(newChecklist);
    } catch (error) {
      if (error instanceof RepositoryError && error.type === RepositoryErrorType.DUPLICATE_KEY) {
        throw new ConflictError('A checklist for this portfolio and date already exists.');
      }
      console.error('Error in ChecklistService.createChecklist:', error);
      throw error;
    }
  }

  /**
   * Updates an existing daily checklist.
   * @param id The ID of the checklist to update.
   * @param data The data for the update.
   */
  async updateChecklist(id: string, data: UpdateDailyChecklistInput): Promise<any> {
    this.validator.validateUpdateChecklist(data);
    await this.findChecklistById(id); // Ensures checklist exists before update
    try {
      const repositoryData = this.transformUpdateDTO(data);
      const updatedChecklist = await this.repository.update(id, repositoryData);
      return this.transformChecklistToDTO(updatedChecklist);
    } catch (error) {
      console.error(`Error in ChecklistService.updateChecklist for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a daily checklist.
   * @param id The ID of the checklist to delete.
   */
  async deleteChecklist(id: string): Promise<void> {
    await this.findChecklistById(id); // Ensures checklist exists before deletion
    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error(`Error in ChecklistService.deleteChecklist for ID ${id}:`, error);
      throw error;
    }
  }

  // --- DTO Transformation ---

  /**
   * Transforms a daily_checklists database entity to a DTO.
   * @param checklist The database entity.
   */
  transformChecklistToDTO(checklist: any): any {
    if (!checklist) return null;
    return {
      id: checklist.id,
      portfolioId: checklist.portfolio_id,
      date: checklist.date,
      totalTasks: checklist.total_tasks,
      completedTasks: checklist.completed_tasks,
      completionPercentage: checklist.completion_percentage,
      currentStreak: checklist.current_streak,
      longestStreak: checklist.longest_streak,
      createdAt: checklist.created_at,
      updatedAt: checklist.updated_at,
      tasks: checklist.tasks ? checklist.tasks.map(this.transformTaskToDTO) : [],
    };
  }
  
  /**
   * Transforms CreateDailyChecklistInput DTO to repository-compatible data.
   * Converts Date objects to ISO strings for the database.
   */
  protected transformCreateDTO(dto: CreateDailyChecklistInput): Partial<DailyChecklist> {
    const transformed: Partial<DailyChecklist> = {
      portfolio_id: dto.portfolioId,
      total_tasks: dto.totalTasks,
      completed_tasks: dto.completedTasks,
      completion_percentage: dto.completionPercentage,
      current_streak: dto.currentStreak,
      longest_streak: dto.longestStreak,
      // Convert Date object to ISO string if present
      date: dto.date ? dto.date.toISOString() : undefined,
    };
    return transformed;
  }
  
  /**
   * Transforms UpdateDailyChecklistInput DTO to repository-compatible data.
   * Converts Date objects to ISO strings for the database.
   */
  protected transformUpdateDTO(dto: UpdateDailyChecklistInput): Partial<DailyChecklist> {
    const transformed: Partial<DailyChecklist> = {};
    if (dto.totalTasks !== undefined) transformed.total_tasks = dto.totalTasks;
    if (dto.completedTasks !== undefined) transformed.completed_tasks = dto.completedTasks;
    if (dto.completionPercentage !== undefined) transformed.completion_percentage = dto.completionPercentage;
    if (dto.currentStreak !== undefined) transformed.current_streak = dto.currentStreak;
    if (dto.longestStreak !== undefined) transformed.longest_streak = dto.longestStreak;
    // Convert Date object to ISO string if present
    if (dto.date !== undefined) transformed.date = dto.date ? dto.date.toISOString() : undefined;
    
    return transformed;
  }

  /**
   * Transforms a checklist_tasks database entity to a DTO.
   * @param task The database entity.
   */
  transformTaskToDTO(task: any): any {
    if (!task) return null;    return {
      id: task.id,
      checklistId: task.checklist_id,
      portfolioId: task.portfolio_id,
      task: task.task,
      category: task.category,
      frequency: task.frequency,
      urgency: task.urgency,
      completed: task.completed,
      completedAt: task.completed_at,
      condition: task.condition,
      dueDate: task.due_date,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }
}

export const checklistService = new ChecklistService();
