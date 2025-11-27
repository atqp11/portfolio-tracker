/**
 * Task API Tests
 *
 * Tests for checklist task CRUD operations.
 */

import { GET, POST, PUT, DELETE } from '@/app/api/tasks/route';
import { createMockRequest, extractJSON, mockUserSession } from '../helpers/test-utils';
import * as authSession from '@/lib/auth/session';
import { taskController } from '@/lib/controllers/task.controller';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/controllers/task.controller');

describe('Task API', () => {
  const mockUser = mockUserSession({
    id: 'user-123',
    email: 'test@example.com',
    tier: 'free',
  });

  const mockTask = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    checklist_id: '550e8400-e29b-41d4-a716-446655440001',
    portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
    task: 'Review portfolio performance',
    category: 'general',
    frequency: 'daily',
    urgency: 3,
    completed: false,
    completed_at: null,
    condition: null,
    due_date: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/tasks',
        searchParams: { portfolioId: mockTask.portfolio_id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 if no query params provided', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const request = createMockRequest({ url: 'http://localhost:3000/api/tasks' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return tasks by portfolio ID', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (taskController.getPortfolioActiveTasks as jest.Mock).mockResolvedValue([mockTask]);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/tasks',
        searchParams: { portfolioId: mockTask.portfolio_id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('should return tasks by checklist ID', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (taskController.getChecklistTasks as jest.Mock).mockResolvedValue([mockTask]);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/tasks',
        searchParams: { checklistId: mockTask.checklist_id! },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('should return single task by ID', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (taskController.getTaskById as jest.Mock).mockResolvedValue(mockTask);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockTask.id);
    });
  });

  describe('POST /api/tasks', () => {
    const validTaskData = {
      portfolio_id: mockTask.portfolio_id,
      task: 'Review portfolio performance',
      category: 'general',
      frequency: 'daily',
      urgency: 3,
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        body: validTaskData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should create task with valid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (taskController.createTask as jest.Mock).mockResolvedValue(mockTask);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        body: validTaskData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockTask.id);
    });

    it('should return 400 with invalid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const invalidData = {
        portfolio_id: mockTask.portfolio_id,
        task: '', // Empty task
      };

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        body: invalidData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/tasks', () => {
    const updateData = {
      completed: true,
      urgency: 5,
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should update task with valid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      const updatedTask = { ...mockTask, ...updateData };
      (taskController.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.completed).toBe(true);
    });
  });

  describe('DELETE /api/tasks', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should delete task successfully', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (taskController.deleteTask as jest.Mock).mockResolvedValue({ success: true });

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/tasks',
        searchParams: { id: mockTask.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
