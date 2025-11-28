/**
 * Portfolio API Tests
 *
 * Tests for portfolio CRUD operations.
 */
// Hoist mocks so route module reads them when it's imported
jest.mock('@/lib/auth/session');
jest.mock('@backend/modules/portfolio/portfolio.controller');
jest.mock('@backend/modules/portfolio/service/portfolio.service');

import { createMockRequest, extractJSON, mockUserSession } from '../helpers/test-utils';
import { createMockPortfolio } from '../helpers/mock-data';
import * as authSession from '@/lib/auth/session';
import { portfolioController } from '@backend/modules/portfolio/portfolio.controller';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';

// Import route handlers dynamically after mocks to ensure they pick up mocked modules
let GET: any, POST: any, PUT: any, DELETE: any;
beforeAll(async () => {
  const route = await import('@/app/api/portfolio/route');
  GET = route.GET;
  POST = route.POST;
  PUT = route.PUT;
  DELETE = route.DELETE;
});

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
      expect(data.error).toBe('Unauthorized'); // Updated to match the API response
    });

    it('should return user portfolios', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioController.getUserPortfolios as jest.Mock).mockResolvedValue([mockPortfolio]);

      const request = createMockRequest({ url: 'http://localhost:3000/api/portfolio' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data[0].id).toBe(mockPortfolio.id); // Updated to match API response structure
      expect(data[0].name).toBe(mockPortfolio.name); // Ensure name field is included
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
      expect(data.id).toBe(mockPortfolio.id); // Updated to match API response structure
      expect(data.name).toBe(mockPortfolio.name); // Ensure name field is included
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
    });
  });

  describe('POST /api/portfolio', () => {
    const validPortfolioData = {
      name: 'Test Portfolio',
      type: 'Investment',
      initialValue: 10000, // Updated to camelCase
      targetValue: 15000, // Updated to camelCase
      borrowedAmount: 0, // Updated to camelCase
      marginCallLevel: 30, // Updated to camelCase
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
      expect(data.error).toBe('Unauthorized'); // Updated to match the API response
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
      expect(data.id).toBe(mockPortfolio.id);
      expect(portfolioController.createPortfolio).toHaveBeenCalledWith(
        expect.objectContaining(validPortfolioData)
      );
    });
  });

  describe('PUT /api/portfolio', () => {
    const updateData = {
      name: 'Updated Portfolio',
      targetValue: 20000, // Updated to camelCase
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
      expect(data.error).toBe('Unauthorized'); // Updated to match the API response
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
      expect(data.name).toBe(updateData.name); // Updated to use optional chaining
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
      expect(data.error).toBe('Unauthorized'); // Updated to match the API response
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
    });

    it('should delete portfolio successfully', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.delete as jest.Mock).mockResolvedValue({ success: true });

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      // DELETE success should return 204 No Content
      expect(response.status).toBe(204);
      expect(data).toBeNull();
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
    });
  });
});
