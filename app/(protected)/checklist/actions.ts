'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@lib/auth/session';
import { checklistService } from '@backend/modules/checklist/service/checklist.service';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import {
  CreateDailyChecklistInput,
  UpdateDailyChecklistInput,
} from '@lib/validators/schemas';

/**
 * Helper to format Zod validation errors into user-friendly messages
 */
function formatValidationError(error: z.ZodError): string {
  if (error.issues && error.issues.length > 0) {
    const firstError = error.issues[0];
    const field = firstError.path.length > 0 ? firstError.path.join('.') : '';
    return field ? `${field}: ${firstError.message}` : firstError.message;
  }
  return 'Validation failed';
}

// Schema for fetching checklist by portfolio type
const fetchChecklistSchema = z.object({
  portfolioType: z.enum(['energy', 'copper']),
});

/**
 * Server Action to fetch checklist for a portfolio type
 * This is a read operation that calls the service layer
 */
export async function fetchChecklistForPortfolio(portfolioType: 'energy' | 'copper') {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Validate input
    const result = fetchChecklistSchema.safeParse({ portfolioType });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    // 3. Fetch portfolio via service (returns DTO)
    const portfolios = await portfolioService.findAll();
    const portfolio = portfolios.find((p: any) => p.type === portfolioType);

    if (!portfolio) {
      return null;
    }

    // 4. Fetch checklist via service (returns DTO)
    const today = new Date().toISOString().split('T')[0];

    try {
      const checklist = await checklistService.findChecklistsByPortfolio(portfolio.id, today);

      // Service returns single object if date is specified
      if (checklist && typeof checklist === 'object' && !Array.isArray(checklist)) {
        return checklist;
      }

      return null;
    } catch (error) {
      // NotFoundError means no checklist exists for today
      return null;
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch checklist');
  }
}

// Schema for updating a task completion state
const updateTaskSchema = z.object({
  checklistId: z.string().uuid(),
  taskId: z.string(),
  completed: z.boolean(),
});

/**
 * Server Action to toggle a checklist task completion
 * This is a mutation that follows the controller pattern
 */
export async function toggleChecklistTask(data: unknown) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Validate with safeParse
    const result = updateTaskSchema.safeParse(data);
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    const { checklistId, taskId, completed } = result.data;

    // 3. Get current checklist via service (returns DTO)
    const checklist = await checklistService.findChecklistById(checklistId);

    // Update the specific task in the appropriate category
    const updateTaskInCategory = (tasks: any[]) =>
      tasks.map(task =>
        task.id === taskId ? { ...task, completed } : task
      );

    const updatedData = {
      morningRoutine: updateTaskInCategory(checklist.morningRoutine || []),
      marketHours: updateTaskInCategory(checklist.marketHours || []),
      eveningReview: updateTaskInCategory(checklist.eveningReview || []),
      eventDriven: updateTaskInCategory(checklist.eventDriven || []),
    };

    // Calculate completion stats
    const allTasks = [
      ...updatedData.morningRoutine,
      ...updatedData.marketHours,
      ...updatedData.eveningReview,
      ...updatedData.eventDriven,
    ];
    const completedCount = allTasks.filter(t => t.completed).length;

    const updatePayload: UpdateDailyChecklistInput = {
      ...updatedData,
      completedTasks: completedCount,
      completionPercentage: (completedCount / allTasks.length) * 100,
    };

    // 4. Update via service (handles validation and DTO transformation)
    await checklistService.updateChecklist(checklistId, updatePayload);

    // 5. Revalidate path
    revalidatePath('/checklist');

    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update task');
  }
}

/**
 * Server Action to create a new checklist
 */
export async function createChecklist(data: unknown) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Create via service (handles validation and DTO transformation)
    const newChecklist = await checklistService.createChecklist(data as CreateDailyChecklistInput);

    // 3. Revalidate path
    revalidatePath('/checklist');

    return { success: true, data: newChecklist };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create checklist');
  }
}

/**
 * Server Action to update a checklist
 */
export async function updateChecklist(checklistId: string, data: unknown) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Update via service (handles validation and DTO transformation)
    const updatedChecklist = await checklistService.updateChecklist(
      checklistId,
      data as UpdateDailyChecklistInput
    );

    // 3. Revalidate path
    revalidatePath('/checklist');

    return { success: true, data: updatedChecklist };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update checklist');
  }
}

/**
 * Server Action to delete a checklist
 */
export async function deleteChecklist(checklistId: string) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Delete via service
    await checklistService.deleteChecklist(checklistId);

    // 3. Revalidate path
    revalidatePath('/checklist');

    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to delete checklist');
  }
}
