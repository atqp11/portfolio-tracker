/**
 * Stock API Tests
 *
 * Tests for stock CRUD operations.
 */

import { GET, POST, PUT, DELETE } from '@/app/api/stocks/route';
import { createMockRequest, extractJSON, mockUserSession } from '../helpers/test-utils';
import * as authSession from '@/lib/auth/session';
import { stockController } from '@/lib/controllers/stock.controller';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/controllers/stock.controller');

describe('Stock API', () => {
  const mockUser = mockUserSession({
    id: 'user-123',
    email: 'test@example.com',
    tier: 'free',
  });

  const mockStock = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 10,
    avg_price: 150.0,
    current_price: 155.0,
    actual_value: 1550.0,
    last_updated: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/stocks', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { portfolioId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 if neither portfolioId nor id is provided', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const request = createMockRequest({ url: 'http://localhost:3000/api/stocks' });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    it('should return portfolio stocks', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.getPortfolioStocks as jest.Mock).mockResolvedValue([mockStock]);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { portfolioId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe(mockStock.id);
      expect(stockController.getPortfolioStocks).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return single stock by ID', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.getStockById as jest.Mock).mockResolvedValue(mockStock);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockStock.id);
      expect(stockController.getStockById).toHaveBeenCalledWith(mockStock.id);
    });

    it('should return 404 if stock not found', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.getStockById as jest.Mock).mockRejectedValue(new Error('Stock not found'));

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: 'non-existent' },
      });
      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/stocks', () => {
    const validStockData = {
      portfolioId: '550e8400-e29b-41d4-a716-446655440000', // Updated to camelCase
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 10,
      avgPrice: 150.0, // Updated to camelCase
      currentPrice: 155.0, // Updated to camelCase
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/stocks',
        body: validStockData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should create stock with valid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.createStock as jest.Mock).mockResolvedValue(mockStock);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/stocks',
        body: validStockData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockStock.id);
      expect(stockController.createStock).toHaveBeenCalledWith(
        expect.objectContaining(validStockData)
      );
    });

    it('should return 400 with invalid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);

      const invalidData = {
        portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: '', // Invalid symbol
        name: '',
      };

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/stocks',
        body: invalidData,
      });
      const response = await POST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/stocks', () => {
    const updateData = {
      shares: 20,
      currentPrice: 160.0, // Updated field name to match the controller
    };

    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
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
        url: 'http://localhost:3000/api/stocks',
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should update stock with valid data', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      const updatedStock = { ...mockStock, ...updateData };
      (stockController.updateStock as jest.Mock).mockResolvedValue(updatedStock);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.shares).toBe(updateData.shares);
      expect(stockController.updateStock).toHaveBeenCalledWith(
        mockStock.id,
        expect.objectContaining(updateData)
      );
    });

    it('should return 403 if user does not own stock', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.updateStock as jest.Mock).mockRejectedValue(
        new Error('Stock not found or access denied')
      );

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
        body: updateData,
      });
      const response = await PUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/stocks', () => {
    it('should return unauthorized if user is not authenticated', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
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
        url: 'http://localhost:3000/api/stocks',
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should delete stock successfully', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.deleteStock as jest.Mock).mockResolvedValue({ success: true });

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(stockController.deleteStock).toHaveBeenCalledWith(mockStock.id);
    });

    it('should return 403 if user does not own stock', async () => {
      (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
      (stockController.deleteStock as jest.Mock).mockRejectedValue(
        new Error('Failed to delete stock: access denied')
      );

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
      });
      const response = await DELETE(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });
});
