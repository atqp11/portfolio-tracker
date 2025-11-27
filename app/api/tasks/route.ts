/**
 * Checklist Task API Routes
 *
 * CRUD operations for checklist tasks with auth and validation (RLS enforced).
 */

import { NextRequest, NextResponse } from 'next/server';
import { taskController } from '@/lib/controllers/task.controller';
import { getUserProfile } from '@/lib/auth/session';
import { SuccessResponse, ErrorResponse } from '@/lib/dto/base/response.dto';

export const dynamic = 'force-dynamic';

// GET /api/tasks - Get tasks by checklist, portfolio, or ID (RLS enforced)
export async function GET(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const checklistId = searchParams.get('checklistId');
    const portfolioId = searchParams.get('portfolioId');
    const id = searchParams.get('id');

    if (id) {
      // Get single task (RLS ensures user can only access their own)
      const task = await taskController.getTaskById(id);
      return NextResponse.json(SuccessResponse.create(task));
    } else if (checklistId) {
      // Get all tasks for a checklist (RLS filters to current user automatically)
      const tasks = await taskController.getChecklistTasks(checklistId);
      return NextResponse.json(SuccessResponse.create(tasks));
    } else if (portfolioId) {
      // Get all active tasks for a portfolio (RLS filters to current user automatically)
      const tasks = await taskController.getPortfolioActiveTasks(portfolioId);
      return NextResponse.json(SuccessResponse.create(tasks));
    } else {
      return NextResponse.json(
        ErrorResponse.badRequest('Checklist ID, Portfolio ID, or Task ID is required'),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(ErrorResponse.notFound('Task'), { status: 404 });
      }
      if (error.message.includes('access denied')) {
        return NextResponse.json(ErrorResponse.forbidden('Access denied'), { status: 403 });
      }
    }

    return NextResponse.json(
      ErrorResponse.internal('Failed to fetch tasks'),
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task (RLS enforced)
export async function POST(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const { createTaskSchema } = await import('@/lib/validators/schemas');

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      const { formatZodError } = await import('@/lib/validators/schemas');
      const formatted = formatZodError(validation.error);
      return NextResponse.json(
        ErrorResponse.validation('Invalid task data', undefined, formatted.errors),
        { status: 400 }
      );
    }

    // Create task (RLS automatically checks portfolio ownership)
    const task = await taskController.createTask(validation.data);

    return NextResponse.json(
      SuccessResponse.create(task),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to create task'),
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Update a task (RLS enforced)
export async function PUT(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    // Get task ID from query
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        ErrorResponse.badRequest('Task ID is required'),
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { updateTaskSchema } = await import('@/lib/validators/schemas');

    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      const { formatZodError } = await import('@/lib/validators/schemas');
      const formatted = formatZodError(validation.error);
      return NextResponse.json(
        ErrorResponse.validation('Invalid task data', undefined, formatted.errors),
        { status: 400 }
      );
    }

    // Update task (RLS ensures user can only update their own)
    const task = await taskController.updateTask(id, validation.data);

    return NextResponse.json(SuccessResponse.create(task));
  } catch (error) {
    console.error('Error updating task:', error);

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(ErrorResponse.forbidden('Access denied'), { status: 403 });
    }

    return NextResponse.json(
      ErrorResponse.internal('Failed to update task'),
      { status: 500 }
    );
  }
}

// DELETE /api/tasks - Delete a task (RLS enforced)
export async function DELETE(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    // Get task ID from query
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        ErrorResponse.badRequest('Task ID is required'),
        { status: 400 }
      );
    }

    // Delete task (RLS ensures user can only delete their own)
    const result = await taskController.deleteTask(id);

    return NextResponse.json(SuccessResponse.noContent());
  } catch (error) {
    console.error('Error deleting task:', error);

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(ErrorResponse.forbidden('Access denied'), { status: 403 });
    }

    return NextResponse.json(
      ErrorResponse.internal('Failed to delete task'),
      { status: 500 }
    );
  }
}
