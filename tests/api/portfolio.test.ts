/**
 * Portfolio API Tests
 *
 * Tests for portfolio CRUD operations.
 */

import { GET, POST, PUT, DELETE } from '@/app/api/portfolio/route';
import { createMockRequest, extractJSON, mockUserSession } from '../helpers/test-utils';
import { createMockPortfolio } from '../helpers/mock-data';
import * as authSession from '@/lib/auth/session';
import { portfolioController } from '@/lib/controllers/portfolio.controller';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/controllers/portfolio.controller');

describe('Portfolio API', () => {
  const mockUser = mockUserSession({
    id: 'user-123',
    email: 'test@example.com',
    tier: 'free',
  });

  const mockPortfolio = createMockPortfolio(mockUser.profile.id);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/portfolio', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({ url: 'http://localhost:3000/api/portfolio' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return user portfolios', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.getUserPortfolios as jest.Mock).mockResolvedValue([mockPortfolio]);

      const request = createMockRequest({ url: 'http://localhost:3000/api/portfolio' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe(mockPortfolio.id);
    });

    it('should return single portfolio by ID', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.getPortfolioById as jest.Mock).mockResolvedValue(mockPortfolio);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockPortfolio.id);
    });

    it('should return 404 if portfolio not found', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.getPortfolioById as jest.Mock).mockRejectedValue(
        new Error('Portfolio not found')
      );

      const request = createMockRequest({
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: 'non-existent' },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 404 if user does not own portfolio (RLS behavior)', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.getPortfolioById as jest.Mock).mockRejectedValue(
        new Error('Portfolio not found')
      );

      const request = createMockRequest({
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/portfolio', () => {
    const validPortfolioData = {
      name: 'Test Portfolio',
      type: 'Investment',
      initial_value: 10000,
      target_value: 15000,
      borrowed_amount: 0,
      margin_call_level: 30,
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/portfolio',
        body: validPortfolioData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should create portfolio with valid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.createPortfolio as jest.Mock).mockResolvedValue(mockPortfolio);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/portfolio',
        body: validPortfolioData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockPortfolio.id);
      expect(portfolioController.createPortfolio).toHaveBeenCalledWith(
        expect.objectContaining(validPortfolioData)
      );
    });

    it('should return 400 with invalid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const invalidData = {
        name: '', // Empty name
        type: 'InvalidType', // Invalid type
      };

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/portfolio',
        body: invalidData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/portfolio', () => {
    const updateData = {
      name: 'Updated Portfolio',
      target_value: 20000,
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 if ID is missing', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/portfolio',
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should update portfolio with valid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      const updatedPortfolio = { ...mockPortfolio, ...updateData };
      (portfolioController.updatePortfolio as jest.Mock).mockResolvedValue(updatedPortfolio);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updateData.name);
    });

    it('should return 403 if user does not own portfolio', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.updatePortfolio as jest.Mock).mockRejectedValue(
        new Error('Portfolio not found or access denied')
      );

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/portfolio', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 if ID is missing', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should delete portfolio successfully', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.deletePortfolio as jest.Mock).mockResolvedValue({ success: true });

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(portfolioController.deletePortfolio).toHaveBeenCalledWith(mockPortfolio.id);
    });

    it('should return 403 if user does not own portfolio', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.deletePortfolio as jest.Mock).mockRejectedValue(
        new Error('Failed to delete portfolio: access denied')
      );

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });
});
