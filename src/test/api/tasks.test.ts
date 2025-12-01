/**
 * Task API Tests (Refactored)
 *
 * Tests for the refactored checklist task CRUD operations.
 */

import { GET, POST, PUT, DELETE } from '@app/api/tasks/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import { taskService } from '@backend/modules/tasks/service/task.service';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';
import { getUser, getUserProfile } from '@lib/auth/session';

// Mock the service layer
jest.mock('@backend/modules/tasks/service/task.service');

// Mock auth session
jest.mock('@lib/auth/session');

const mockUser = {
  id: 'user-uuid',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'user-uuid',
  email: 'test@example.com',
  tier: 'free',
};

const mockTask = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  checklistId: '550e8400-e29b-41d4-a716-446655440001',
  portfolioId: '550e8400-e29b-41d4-a716-446655440000',
  task: 'Review portfolio performance',
  category: 'general',
  frequency: 'daily',
  urgency: 3,
  completed: false,
  completedAt: null,
  condition: null,
  dueDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const VALID_UUID = 'b9d6e8e0-2c3b-4f1a-8f6f-4d7b3e1a1b2d';

describe('Task API (Refactored)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    (getUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
  });

  describe('GET /api/tasks', () => {
    it('should return 400 if no valid query param is provided', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/tasks' });
      const response = await GET(request, {});
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return tasks by portfolio ID', async () => {
      (taskService.findActiveByPortfolioId as jest.Mock).mockResolvedValue([mockTask]);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/tasks',
        searchParams: { portfolioId: mockTask.portfolioId },
      });
      const response = await GET(request, { query: { portfolioId: mockTask.portfolioId } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(taskService.findActiveByPortfolioId).toHaveBeenCalledWith(mockTask.portfolioId);
    });

    it('should return tasks by checklist ID', async () => {
        (taskService.findByChecklistId as jest.Mock).mockResolvedValue([mockTask]);
  
        const request = createMockRequest({
          url: 'http://localhost:3000/api/tasks',
          searchParams: { checklistId: mockTask.checklistId },
        });
        const response = await GET(request, { query: { checklistId: mockTask.checklistId } });
        const data = await extractJSON(response);
  
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(taskService.findByChecklistId).toHaveBeenCalledWith(mockTask.checklistId);
      });

    it('should return a single task by ID', async () => {
      (taskService.findById as jest.Mock).mockResolvedValue(mockTask);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
      });
      const response = await GET(request, { query: { id: mockTask.id } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockTask.id);
      expect(taskService.findById).toHaveBeenCalledWith(mockTask.id);
    });
  });

  describe('POST /api/tasks', () => {
    const validTaskData = {
      portfolioId: mockTask.portfolioId,
      task: 'New task',
      category: 'review',
    };

    it('should create a task with valid data', async () => {
      (taskService.create as jest.Mock).mockResolvedValue(mockTask);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        body: validTaskData,
      });
      const response = await POST(request, { body: validTaskData });
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockTask.id);
      expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining(validTaskData));
    });
  });

  describe('PUT /api/tasks', () => {
    const updateData = { completed: true };

    it('should update a task with valid data', async () => {
      const updatedTask = { ...mockTask, ...updateData };
      (taskService.update as jest.Mock).mockResolvedValue(updatedTask);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
        body: updateData,
      });
      const response = await PUT(request, { query: { id: mockTask.id }, body: updateData });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.completed).toBe(true);
      expect(taskService.update).toHaveBeenCalledWith(mockTask.id, expect.objectContaining(updateData));
    });

    it('should return 404 for a non-existent task', async () => {
      (taskService.update as jest.Mock).mockRejectedValue(new NotFoundError('Task not found'));

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: VALID_UUID },
        body: updateData,
      });
      const response = await PUT(request, { query: { id: VALID_UUID }, body: updateData });
      const data = await extractJSON(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/tasks', () => {
    it('should delete a task successfully', async () => {
      (taskService.delete as jest.Mock).mockResolvedValue(undefined);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
      });
      const response = await DELETE(request, { query: { id: mockTask.id } });

      expect(response.status).toBe(204);
      expect(taskService.delete).toHaveBeenCalledWith(mockTask.id);
    });
  });
});
