/**
 * Daily Checklist API Integration Tests
 */

import { GET, POST, PUT, DELETE } from '@app/api/checklist/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import { checklistRepository } from '@backend/modules/checklist/repository/checklist.repository';
import * as authSession from '@lib/auth/session';

// Mock the entire repository module
jest.mock('@backend/modules/checklist/repository/checklist.repository', () => ({
    __esModule: true,
    checklistRepository: {
      findByIdWithTasks: jest.fn(),
      findByPortfolioIdAndDate: jest.fn(),
      findLatestByPortfolioId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }));
jest.mock('@lib/auth/session');

// Mock authenticated user
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440099',
  email: 'test@example.com',
  tier: 'free',
  is_admin: false,
};

const mockTask = { id: 't1', task: 'Test task', completed: false };
const mockChecklist = {
  id: 'a6ebbadd-fab0-40cd-9b88-f2f5b5b2709d', // Updated to a valid UUID
  portfolio_id: 'dae5345a-aebc-475f-b394-7e7a9d1bffdb',
  date: new Date().toISOString(),
  total_tasks: 1,
  completed_tasks: 0,
  tasks: [mockTask],
};

const VALID_UUID = '04def880-7f49-4257-ac6c-c7f3ec19f7b2';

describe('Checklist API (Integration)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user by default
    (authSession.getUser as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('GET /api/checklist', () => {
    it('should return a checklist by id', async () => {
      (checklistRepository.findByIdWithTasks as jest.Mock).mockResolvedValue(mockChecklist);

      const request = createMockRequest({ url: 'http://localhost:3000/api/checklist', searchParams: { id: mockChecklist.id } });
      const response = await GET(request, { query: { id: mockChecklist.id } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.data.id).toBe(mockChecklist.id);
      expect(checklistRepository.findByIdWithTasks).toHaveBeenCalledWith(mockChecklist.id);
    });
  });

  describe('POST /api/checklist', () => {
    // Update createData to match the validation schema
    const createData = {
      portfolioId: '1c6f2008-3cb7-4de4-8f47-f58feeb68d35', // Valid UUID
      date: new Date().toISOString(), // Valid ISO date string
    };

    it('should create a new checklist', async () => {
      (checklistRepository.create as jest.Mock).mockResolvedValue(mockChecklist);

      const request = createMockRequest({ url: 'http://localhost:3000/api/checklist', method: 'POST', body: createData });
      const response = await POST(request, { body: createData });
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(checklistRepository.create).toHaveBeenCalledWith(expect.objectContaining({ portfolio_id: createData.portfolioId }));
    });
  });

  describe('PUT /api/checklist', () => {
    // Update updateData to match the validation schema
    const updateData = {
      completed_tasks: 0,
      completion_percentage: 0,
      current_streak: 0,
      longest_streak: 0,
      total_tasks: 0,
    };
    it('should update a checklist', async () => {
        (checklistRepository.findByIdWithTasks as jest.Mock).mockResolvedValue(mockChecklist);
        (checklistRepository.update as jest.Mock).mockResolvedValue({ ...mockChecklist, ...updateData });
  
        const request = createMockRequest({ url: 'http://localhost:3000/api/checklist', method: 'PUT', body: { id: mockChecklist.id, ...updateData } });
        const response = await PUT(request, { body: { id: mockChecklist.id, ...updateData } });
        const data = await extractJSON(response);
  
        expect(response.status).toBe(200);
        expect(data.data.completedTasks).toBe(0);
        expect(checklistRepository.update).toHaveBeenCalledWith(mockChecklist.id, updateData);
      });
  });

  describe('DELETE /api/checklist', () => {
    it('should delete a checklist', async () => {
        (checklistRepository.findByIdWithTasks as jest.Mock).mockResolvedValue(mockChecklist);
        (checklistRepository.delete as jest.Mock).mockResolvedValue(undefined);

      const request = createMockRequest({ url: 'http://localhost:3000/api/checklist', method: 'DELETE', searchParams: { id: mockChecklist.id } });
      const response = await DELETE(request, { query: { id: mockChecklist.id } });
      expect(response.status).toBe(204);
      expect(checklistRepository.delete).toHaveBeenCalledWith(mockChecklist.id);
    });
  });
});