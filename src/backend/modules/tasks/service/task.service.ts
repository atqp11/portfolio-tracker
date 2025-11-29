/**
 * Task Service
 *
 * Business logic layer for checklist task operations.
 * Handles data transformation, validation, and business rules.
 */

import { taskRepository } from '@backend/modules/tasks/repository/task.repository';
import { CreateTaskInput, UpdateTaskInput } from '@lib/validators/schemas';
import { Database } from '@lib/supabase/database.types';

type ChecklistTask = Database['public']['Tables']['checklist_tasks']['Row'];

export class TaskService {
  /**
   * Get all tasks for a checklist
   */
  async findByChecklistId(checklistId: string): Promise<any[]> {
    const tasks = await taskRepository.findByChecklistId(checklistId);
    return tasks.map(task => this.transformToDTO(task));
  }

  /**
   * Get active tasks for a portfolio
   */
  async findActiveByPortfolioId(portfolioId: string): Promise<any[]> {
    const tasks = await taskRepository.findActiveByPortfolioId(portfolioId);
    return tasks.map(task => this.transformToDTO(task));
  }

  /**
   * Get single task by ID
   */
  async findById(taskId: string): Promise<any> {
    const task = await taskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    return this.transformToDTO(task);
  }

  /**
   * Create a new task
   * Applies business rules and transforms DTO to database model
   */
  async create(data: CreateTaskInput): Promise<any> {
    // Transform DTO and apply business logic
    const taskData = this.transformCreateDTO(data);

    // Validate business rules
    this.validateCreateData(taskData);

    const task = await taskRepository.create(taskData);
    return this.transformToDTO(task);
  }

  /**
   * Update an existing task
   * Applies business rules and transforms DTO to database model
   */
  async update(taskId: string, data: UpdateTaskInput): Promise<any> {
    // Verify task exists
    await this.findById(taskId);

    // Transform DTO to database model
    const updateData = this.transformUpdateDTO(data);

    // Validate business rules
    this.validateUpdateData(updateData);

    // Business logic: auto-set completed_at when marking as completed
    if (data.completed === true && !data.completedAt) {
      updateData.completed_at = new Date().toISOString();
    }

    // Business logic: clear completed_at when marking as incomplete
    if (data.completed === false) {
      updateData.completed_at = null;
    }

    const task = await taskRepository.update(taskId, updateData);
    return this.transformToDTO(task);
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<{ success: boolean }> {
    // Verify task exists
    await this.findById(taskId);

    await taskRepository.delete(taskId);
    return { success: true };
  }

  /**
   * Mark task as completed
   * Convenience method for common operation
   */
  async markCompleted(taskId: string): Promise<any> {
    return this.update(taskId, {
      completed: true,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark task as incomplete
   * Convenience method for common operation
   */
  async markIncomplete(taskId: string): Promise<any> {
    return this.update(taskId, {
      completed: false,
      completedAt: null,
    });
  }

  /**
   * Transform create DTO from camelCase to snake_case
   */
  private transformCreateDTO(data: CreateTaskInput) {
    const taskData: any = {
      portfolio_id: data.portfolioId,
      task: data.task,
      category: data.category,
      frequency: data.frequency,
      urgency: data.urgency,
      completed: data.completed ?? false, // Default to not completed
      condition: data.condition ?? null,
    };

    if (data.checklistId) {
      taskData.checklist_id = data.checklistId;
    }

    if (data.completedAt) {
      taskData.completed_at = data.completedAt;
    }

    if (data.dueDate) {
      taskData.due_date = data.dueDate;
    }

    return taskData;
  }

  /**
   * Transform update DTO from camelCase to snake_case
   */
  private transformUpdateDTO(data: UpdateTaskInput) {
    const updateData: any = {};

    if (data.task !== undefined) updateData.task = data.task;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.urgency !== undefined) updateData.urgency = data.urgency;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.completedAt !== undefined) updateData.completed_at = data.completedAt;
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate;

    return updateData;
  }

  /**
   * Validate create data (business rules)
   */
  private validateCreateData(data: any): void {
    // Business rule: task description must not be empty
    if (!data.task || data.task.trim().length === 0) {
      throw new Error('Task description is required');
    }

    // Business rule: urgency must be valid (0-3)
    if (data.urgency < 0 || data.urgency > 3) {
      throw new Error('Urgency must be between 0 and 3');
    }

    // Business rule: if completed is true, completed_at should be set
    if (data.completed && !data.completed_at) {
      throw new Error('Completed tasks must have a completion date');
    }

    // Business rule: due date cannot be in the past (if set)
    if (data.due_date) {
      const dueDate = new Date(data.due_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      if (dueDate < now) {
        throw new Error('Due date cannot be in the past');
      }
    }
  }

  /**
   * Validate update data (business rules)
   */
  private validateUpdateData(data: any): void {
    if (data.task !== undefined && (!data.task || data.task.trim().length === 0)) {
      throw new Error('Task description is required');
    }

    if (data.urgency !== undefined && (data.urgency < 0 || data.urgency > 3)) {
      throw new Error('Urgency must be between 0 and 3');
    }

    // Business rule: if setting due date, it cannot be in the past
    if (data.due_date !== undefined && data.due_date !== null) {
      const dueDate = new Date(data.due_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (dueDate < now) {
        throw new Error('Due date cannot be in the past');
      }
    }
  }

  /**
   * Transform database model (snake_case) to DTO (camelCase)
   */
  private transformToDTO(task: ChecklistTask): any {
    if (!task) return task;

    return {
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

// Export singleton instance
export const taskService = new TaskService();
