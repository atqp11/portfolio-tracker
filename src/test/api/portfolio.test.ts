/**
 * Portfolio API Tests
 *
 * Tests for portfolio CRUD operations.
 * Mocks the service layer and auth session.
 */

// Hoist mocks so modules pick them up when imported
jest.mock('@lib/auth/session');
jest.mock('@backend/modules/portfolio/service/portfolio.service');

import { createMockRequest, extractJSON, mockUserSession } from '../helpers/test-utils';
import { createMockPortfolio } from '../helpers/mock-data';
import * as authSession from '@lib/auth/session';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import { NotFoundError, ForbiddenError } from '@backend/common/middleware/error-handler.middleware';

// Import route handlers dynamically after mocks to ensure they pick up mocked modules
let GET: any, POST: any, PUT: any, DELETE: any;
beforeAll(async () => {
  const route = await import('@app/api/portfolio/route');
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

  const mockAuthUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockPortfolio = createMockPortfolio(mockUser.profile.id);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/portfolio', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(null);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({ url: 'http://localhost:3000/api/portfolio' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return user portfolios', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.findAll as jest.Mock).mockResolvedValue([mockPortfolio]);

      const request = createMockRequest({ url: 'http://localhost:3000/api/portfolio' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].id).toBe(mockPortfolio.id);
      expect(data.data[0].name).toBe(mockPortfolio.name);
    });

    it('should return single portfolio by ID', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.findById as jest.Mock).mockResolvedValue(mockPortfolio);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockPortfolio.id);
      expect(data.data.name).toBe(mockPortfolio.name);
    });

    it('should return 404 if portfolio not found', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.findById as jest.Mock).mockRejectedValue(
        new NotFoundError('Portfolio not found')
      );

      const request = createMockRequest({
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/portfolio', () => {
    const validPortfolioData = {
      name: 'Test Portfolio',
      type: 'Investment',
      initialValue: 10000,
      targetValue: 15000,
      borrowedAmount: 0,
      marginCallLevel: 30,
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(null);
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
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should create portfolio with valid data', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.create as jest.Mock).mockResolvedValue(mockPortfolio);

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
      expect(portfolioService.create).toHaveBeenCalledWith(
        expect.objectContaining(validPortfolioData)
      );
    });
  });

  describe('PUT /api/portfolio', () => {
    const updateData = {
      name: 'Updated Portfolio',
      targetValue: 20000,
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(null);
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
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 if ID is missing', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
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
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update portfolio with valid data', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      const updatedPortfolio = { ...mockPortfolio, ...updateData };
      (portfolioService.update as jest.Mock).mockResolvedValue(updatedPortfolio);

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
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.update as jest.Mock).mockRejectedValue(
        new ForbiddenError('Access denied')
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
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/portfolio', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(null);
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
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 if ID is missing', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should delete portfolio successfully', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.delete as jest.Mock).mockResolvedValue(undefined);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/portfolio',
        searchParams: { id: mockPortfolio.id },
      });
      const response = await DELETE(request);

      expect(response.status).toBe(204);
      expect(portfolioService.delete).toHaveBeenCalledWith(mockPortfolio.id);
    });

    it('should return 403 if user does not own portfolio', async () => {
      (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (portfolioService.delete as jest.Mock).mockRejectedValue(
        new ForbiddenError('Access denied')
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
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});
