/**
 * Server Actions Tests for Checklist
 *
 * Tests the server-side business logic for checklist operations.
 * These tests verify that Server Actions properly:
 * - Validate input using Zod schemas
 * - Call service layer correctly
 * - Handle errors appropriately
 * - Return proper DTOs
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  fetchChecklistForPortfolio,
  toggleChecklistTask,
  createChecklist,
  updateChecklist,
  deleteChecklist,
} from '../actions';

// Mock dependencies
jest.mock('@lib/auth/session');
jest.mock('@backend/modules/checklist/service/checklist.service');
jest.mock('@backend/modules/portfolio/service/portfolio.service');
jest.mock('next/cache');

import { requireUser } from '@lib/auth/session';
import { checklistService } from '@backend/modules/checklist/service/checklist.service';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import { revalidatePath } from 'next/cache';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockChecklistService = checklistService as jest.Mocked<typeof checklistService>;
const mockPortfolioService = portfolioService as jest.Mocked<typeof portfolioService>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

describe('Checklist Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
    } as any);
  });

  describe('fetchChecklistForPortfolio', () => {
    it('should fetch checklist for valid portfolio type', async () => {
      const mockPortfolio = {
        id: 'portfolio-123',
        type: 'energy',
        name: 'Energy Portfolio',
      };

      const mockChecklist = {
        id: 'checklist-123',
        portfolioId: 'portfolio-123',
        date: new Date(),
        totalTasks: 5,
        completedTasks: 2,
        completionPercentage: 40,
      };

      mockPortfolioService.findAll.mockResolvedValue([mockPortfolio] as any);
      mockChecklistService.findChecklistsByPortfolio.mockResolvedValue(mockChecklist as any);

      const result = await fetchChecklistForPortfolio('energy');

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockPortfolioService.findAll).toHaveBeenCalled();
      expect(mockChecklistService.findChecklistsByPortfolio).toHaveBeenCalledWith(
        'portfolio-123',
        expect.any(String)
      );
      expect(result).toEqual(mockChecklist);
    });

    it('should return null when portfolio not found', async () => {
      mockPortfolioService.findAll.mockResolvedValue([]);

      const result = await fetchChecklistForPortfolio('energy');

      expect(result).toBeNull();
    });

    it('should return null when checklist not found', async () => {
      const mockPortfolio = {
        id: 'portfolio-123',
        type: 'energy',
      };

      mockPortfolioService.findAll.mockResolvedValue([mockPortfolio] as any);
      mockChecklistService.findChecklistsByPortfolio.mockRejectedValue(
        new Error('Checklist not found')
      );

      const result = await fetchChecklistForPortfolio('energy');

      expect(result).toBeNull();
    });

    it('should reject invalid portfolio type', async () => {
      await expect(fetchChecklistForPortfolio('invalid' as any)).rejects.toThrow();
    });
  });

  describe('toggleChecklistTask', () => {
    it('should toggle task completion successfully', async () => {
      const mockChecklist = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        portfolioId: '550e8400-e29b-41d4-a716-446655440001',
        morningRoutine: [
          { id: 'task-1', completed: false },
          { id: 'task-2', completed: true },
        ],
        marketHours: [],
        eveningReview: [],
        eventDriven: [],
      };

      mockChecklistService.findChecklistById.mockResolvedValue(mockChecklist as any);
      mockChecklistService.updateChecklist.mockResolvedValue({} as any);

      const result = await toggleChecklistTask({
        checklistId: '550e8400-e29b-41d4-a716-446655440000',
        taskId: 'task-1',
        completed: true,
      });

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockChecklistService.findChecklistById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockChecklistService.updateChecklist).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/checklist');
      expect(result).toEqual({ success: true });
    });

    it('should validate input schema', async () => {
      await expect(
        toggleChecklistTask({
          checklistId: 'invalid-uuid',
          taskId: 'task-1',
          completed: 'not-a-boolean',
        })
      ).rejects.toThrow('checklistId: Invalid UUID');
    });

    it('should require authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Not authenticated'));

      await expect(
        toggleChecklistTask({
          checklistId: 'checklist-123',
          taskId: 'task-1',
          completed: true,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('createChecklist', () => {
    it('should create checklist successfully', async () => {
      const newChecklistData = {
        portfolioId: 'portfolio-123',
        totalTasks: 5,
        completedTasks: 0,
        completionPercentage: 0,
        currentStreak: 0,
        longestStreak: 0,
      };

      const createdChecklist = {
        id: 'checklist-123',
        ...newChecklistData,
      };

      mockChecklistService.createChecklist.mockResolvedValue(createdChecklist as any);

      const result = await createChecklist(newChecklistData);

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockChecklistService.createChecklist).toHaveBeenCalledWith(newChecklistData);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/checklist');
      expect(result).toEqual({ success: true, data: createdChecklist });
    });

    it('should handle service errors', async () => {
      mockChecklistService.createChecklist.mockRejectedValue(
        new Error('Failed to create checklist')
      );

      await expect(createChecklist({})).rejects.toThrow('Failed to create checklist');
    });
  });

  describe('updateChecklist', () => {
    it('should update checklist successfully', async () => {
      const updateData = {
        completedTasks: 3,
        completionPercentage: 60,
      };

      const updatedChecklist = {
        id: 'checklist-123',
        ...updateData,
      };

      mockChecklistService.updateChecklist.mockResolvedValue(updatedChecklist as any);

      const result = await updateChecklist('checklist-123', updateData);

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockChecklistService.updateChecklist).toHaveBeenCalledWith(
        'checklist-123',
        updateData
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/checklist');
      expect(result).toEqual({ success: true, data: updatedChecklist });
    });
  });

  describe('deleteChecklist', () => {
    it('should delete checklist successfully', async () => {
      mockChecklistService.deleteChecklist.mockResolvedValue(undefined);

      const result = await deleteChecklist('550e8400-e29b-41d4-a716-446655440000');

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockChecklistService.deleteChecklist).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/checklist');
      expect(result).toEqual({ success: true });
    });

    it('should handle deletion errors', async () => {
      mockChecklistService.deleteChecklist.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteChecklist('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow('Delete failed');
    });
  });
});
