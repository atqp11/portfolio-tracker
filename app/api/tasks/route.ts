import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tasks - Get all tasks for a checklist
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const checklistId = searchParams.get('checklistId');
    const portfolioId = searchParams.get('portfolioId');
    const id = searchParams.get('id');

    if (id) {
      // Get single task
      const task = await prisma.checklistTask.findUnique({
        where: { id },
      });

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(task);
    } else if (checklistId) {
      // Get all tasks for a checklist
      const tasks = await prisma.checklistTask.findMany({
        where: { checklistId },
        orderBy: [
          { urgency: 'desc' },
          { completed: 'asc' },
        ],
      });

      return NextResponse.json(tasks);
    } else if (portfolioId) {
      // Get all active tasks for a portfolio (without specific checklist)
      const tasks = await prisma.checklistTask.findMany({
        where: {
          portfolioId,
          completed: false,
        },
        orderBy: [
          { urgency: 'desc' },
          { dueDate: 'asc' },
        ],
      });

      return NextResponse.json(tasks);
    } else {
      return NextResponse.json(
        { error: 'Checklist ID or Portfolio ID is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      checklistId,
      portfolioId,
      task,
      category,
      frequency,
      urgency,
      completed,
      completedAt,
      condition,
      dueDate,
    } = body;

    // Validation
    if (!portfolioId || !task) {
      return NextResponse.json(
        { error: 'Portfolio ID and task are required' },
        { status: 400 }
      );
    }

    const newTask = await prisma.checklistTask.create({
      data: {
        checklistId: checklistId || null,
        portfolioId,
        task,
        category: category || 'general',
        frequency: frequency || 'daily',
        urgency: urgency || 1,
        completed: completed || false,
        completedAt: completedAt ? new Date(completedAt) : null,
        condition: condition || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Update a task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      task,
      category,
      frequency,
      urgency,
      completed,
      completedAt,
      condition,
      dueDate,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.checklistTask.update({
      where: { id },
      data: {
        ...(task && { task }),
        ...(category && { category }),
        ...(frequency && { frequency }),
        ...(urgency !== undefined && { urgency }),
        ...(completed !== undefined && { completed }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
        ...(condition !== undefined && { condition }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    await prisma.checklistTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
