/**
 * Task Controller
 *
 * Thin HTTP controller layer for checklist task operations.
 * Delegates business logic to TaskService.
 */

import { taskService } from '@/lib/services/task.service';
import { CreateTaskInput, UpdateTaskInput } from '@/lib/validators/schemas';

export class TaskController {
  /**
   * Get all tasks for a checklist (RLS enforced)
   */
  async getChecklistTasks(checklistId: string) {
    return taskService.findByChecklistId(checklistId);
  }

  /**
   * Get active tasks for a portfolio (RLS enforced)
   */
  async getPortfolioActiveTasks(portfolioId: string) {
    return taskService.findActiveByPortfolioId(portfolioId);
  }

  /**
   * Get single task by ID (RLS enforced)
   */
  async getTaskById(taskId: string) {
    return taskService.findById(taskId);
  }

  /**
   * Create a new task (RLS enforced)
   */
  async createTask(data: CreateTaskInput) {
    return taskService.create(data);
  }

  /**
   * Update a task (RLS enforced - ownership checked by Supabase)
   */
  async updateTask(taskId: string, data: UpdateTaskInput) {
    return taskService.update(taskId, data);
  }

  /**
   * Delete a task (RLS enforced - ownership checked by Supabase)
   */
  async deleteTask(taskId: string) {
    return taskService.delete(taskId);
  }
}

// Export singleton instance
export const taskController = new TaskController();
