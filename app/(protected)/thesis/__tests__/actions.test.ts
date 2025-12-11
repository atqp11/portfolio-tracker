/**
 * Server Actions Tests for Investment Thesis
 *
 * Tests the server-side business logic for thesis operations.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  fetchThesesForPortfolio,
  fetchPortfolioData,
  createThesis,
  updateThesis,
  deleteThesis,
  validateThesis,
} from '../actions';

// Mock dependencies
jest.mock('@lib/auth/session');
jest.mock('@backend/modules/thesis/service/thesis.service');
jest.mock('@backend/modules/portfolio/service/portfolio.service');
jest.mock('next/cache');

import { requireUser } from '@lib/auth/session';
import { thesisService } from '@backend/modules/thesis/service/thesis.service';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import { revalidatePath } from 'next/cache';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockThesisService = thesisService as jest.Mocked<typeof thesisService>;
const mockPortfolioService = portfolioService as jest.Mocked<typeof portfolioService>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

describe('Thesis Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
    } as any);
  });

  describe('fetchThesesForPortfolio', () => {
    it('should fetch theses for valid portfolio type', async () => {
      const mockPortfolio = {
        id: 'portfolio-123',
        type: 'energy',
      };

      const mockTheses = [
        {
          id: 'thesis-1',
          portfolioId: 'portfolio-123',
          title: 'Energy Transition',
          description: 'Renewable energy thesis',
        },
      ];

      mockPortfolioService.findAll.mockResolvedValue([mockPortfolio] as any);
      mockThesisService.findByPortfolioId.mockResolvedValue(mockTheses as any);

      const result = await fetchThesesForPortfolio('energy');

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockPortfolioService.findAll).toHaveBeenCalled();
      expect(mockThesisService.findByPortfolioId).toHaveBeenCalledWith('portfolio-123');
      expect(result).toEqual(mockTheses);
    });

    it('should return empty array when portfolio not found', async () => {
      mockPortfolioService.findAll.mockResolvedValue([]);

      const result = await fetchThesesForPortfolio('energy');

      expect(result).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      const mockPortfolio = { id: 'portfolio-123', type: 'energy' };
      mockPortfolioService.findAll.mockResolvedValue([mockPortfolio] as any);
      mockThesisService.findByPortfolioId.mockRejectedValue(new Error('Service error'));

      const result = await fetchThesesForPortfolio('energy');

      expect(result).toEqual([]);
    });
  });

  describe('fetchPortfolioData', () => {
    it('should fetch portfolio data successfully', async () => {
      const mockPortfolio = {
        id: 'portfolio-123',
        type: 'energy',
        initialValue: 20000,
        borrowedAmount: 6000,
      };

      mockPortfolioService.findAll.mockResolvedValue([mockPortfolio] as any);

      const result = await fetchPortfolioData('energy');

      expect(result).toEqual(mockPortfolio);
    });

    it('should return null when portfolio not found', async () => {
      mockPortfolioService.findAll.mockResolvedValue([]);

      const result = await fetchPortfolioData('copper');

      expect(result).toBeNull();
    });
  });

  describe('createThesis', () => {
    it('should create thesis successfully', async () => {
      const newThesisData = {
        portfolioId: 'portfolio-123',
        ticker: 'TSLA',
        title: 'Tesla Growth Thesis',
        description: 'EV market leader',
        rationale: 'Strong fundamentals',
      };

      const createdThesis = {
        id: 'thesis-123',
        ...newThesisData,
      };

      mockThesisService.create.mockResolvedValue(createdThesis as any);

      const result = await createThesis(newThesisData);

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockThesisService.create).toHaveBeenCalledWith(newThesisData);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/thesis');
      expect(result).toEqual({ success: true, data: createdThesis });
    });

    it('should handle validation errors', async () => {
      mockThesisService.create.mockRejectedValue(new Error('Validation failed'));

      await expect(createThesis({})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateThesis', () => {
    it('should update thesis successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const updatedThesis = {
        id: 'thesis-123',
        ...updateData,
      };

      mockThesisService.update.mockResolvedValue(updatedThesis as any);

      const result = await updateThesis('thesis-123', updateData);

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockThesisService.update).toHaveBeenCalledWith('thesis-123', updateData);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/thesis');
      expect(result).toEqual({ success: true, data: updatedThesis });
    });
  });

  describe('deleteThesis', () => {
    it('should delete thesis successfully', async () => {
      mockThesisService.delete.mockResolvedValue(undefined);

      const result = await deleteThesis('thesis-123');

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockThesisService.delete).toHaveBeenCalledWith('thesis-123');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/thesis');
      expect(result).toEqual({ success: true });
    });
  });

  describe('validateThesis', () => {
    it('should validate thesis successfully when all criteria met', async () => {
      const validThesis = {
        id: 'thesis-123',
        title: 'Valid Thesis',
        description: 'Valid description',
        rationale: 'Sound reasoning',
        exitCriteria: { targetValue: 50000 },
        keyMetrics: [
          { name: 'P/E Ratio', urgency: 'green' },
        ],
      };

      mockThesisService.findById.mockResolvedValue(validThesis as any);

      const result = await validateThesis('thesis-123');

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should detect missing required fields', async () => {
      const invalidThesis = {
        id: 'thesis-123',
        title: '',
        description: '',
        rationale: 'Valid rationale',
        exitCriteria: {},
        keyMetrics: [],
      };

      mockThesisService.findById.mockResolvedValue(invalidThesis as any);

      const result = await validateThesis('thesis-123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required fields');
      expect(result.errors).toContain('Exit criteria missing');
    });

    it('should detect critical metrics', async () => {
      const thesisWithRedMetrics = {
        id: 'thesis-123',
        title: 'Thesis',
        description: 'Description',
        rationale: 'Rationale',
        exitCriteria: { targetValue: 50000 },
        keyMetrics: [
          { name: 'Debt Ratio', urgency: 'red', condition: 'Critical threshold exceeded' },
        ],
      };

      mockThesisService.findById.mockResolvedValue(thesisWithRedMetrics as any);

      const result = await validateThesis('thesis-123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Debt Ratio: Critical threshold exceeded');
    });
  });
});
