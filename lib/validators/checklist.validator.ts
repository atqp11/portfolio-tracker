/**
 * Checklist and Task Validator
 *
 * Uses Zod schemas to validate input data for DailyChecklists and ChecklistTasks.
 */
import {
  createDailyChecklistSchema,
  updateDailyChecklistSchema,
  createTaskSchema,
  updateTaskSchema,
  CreateDailyChecklistInput,
  UpdateDailyChecklistInput,
  CreateTaskInput,
  UpdateTaskInput,
  formatZodError
} from '@/lib/validators/schemas';
import { ValidationError } from '@/server/middleware/validation.middleware';

export class ChecklistValidator {
  /**
   * Validates data for creating a new daily checklist.
   */
  public validateCreateChecklist(data: unknown): asserts data is CreateDailyChecklistInput {
    const result = createDailyChecklistSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid daily checklist creation data.', formatZodError(result.error).errors);
    }
  }

  /**
   * Validates data for updating a daily checklist.
   */
  public validateUpdateChecklist(data: unknown): asserts data is UpdateDailyChecklistInput {
    const result = updateDailyChecklistSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid daily checklist update data.', formatZodError(result.error).errors);
    }
  }

  /**
   * Validates data for creating a new checklist task.
   */
  public validateCreateTask(data: unknown): asserts data is CreateTaskInput {
    const result = createTaskSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid task creation data.', formatZodError(result.error).errors);
    }
  }

  /**
   * Validates data for updating a checklist task.
   */
  public validateUpdateTask(data: unknown): asserts data is UpdateTaskInput {
    const result = updateTaskSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid task update data.', formatZodError(result.error).errors);
    }
  }
}

export const checklistValidator = new ChecklistValidator();
