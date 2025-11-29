import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { taskService } from '@backend/modules/tasks/service/task.service';
import { createTaskSchema, updateTaskSchema, commonSchemas } from '@lib/validators/schemas';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// Schema for GET request query parameters
const getTaskQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  checklistId: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
}).refine(data => data.id || data.checklistId || data.portfolioId, {
  message: 'Either id, checklistId, or portfolioId must be provided.',
});

// Schema for DELETE request query parameters
const deleteTaskQuerySchema = z.object({
  id: commonSchemas.uuid,
});

class TaskController {
  async get(request: NextRequest, { query }: { query: z.infer<typeof getTaskQuerySchema> }) {
    if (query.id) {
      const task = await taskService.findById(query.id);
      return NextResponse.json({ success: true, data: task });
    } else if (query.checklistId) {
      const tasks = await taskService.findByChecklistId(query.checklistId);
      return NextResponse.json({ success: true, data: tasks });
    } else if (query.portfolioId) {
      const tasks = await taskService.findActiveByPortfolioId(query.portfolioId);
      return NextResponse.json({ success: true, data: tasks });
    }
    throw new NotFoundError('Invalid query parameters for getting tasks.');
  }

  async create(request: NextRequest, { body }: { body: z.infer<typeof createTaskSchema> }) {
    const newTask = await taskService.create(body);
    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  }

  async update(request: NextRequest, { query, body }: { query: { id: string }, body: z.infer<typeof updateTaskSchema> }) {
    const { id } = query;
    if (!id) {
      throw new NotFoundError('Task ID is required as a query parameter for an update.');
    }
    const updatedTask = await taskService.update(id, body);
    return NextResponse.json({ success: true, data: updatedTask });
  }

  async delete(request: NextRequest, { query }: { query: z.infer<typeof deleteTaskQuerySchema> }) {
    await taskService.delete(query.id);
    return new NextResponse(null, { status: 204 });
  }
}

export const taskController = new TaskController();