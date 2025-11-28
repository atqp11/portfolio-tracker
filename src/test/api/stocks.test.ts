/**
 * Stock API Tests (Refactored)
 *
 * Tests for the refactored stock CRUD operations using middleware and service layers.
 */

import { GET, POST, PUT, DELETE } from '@/app/api/stocks/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import { stockService } from '@backend/modules/stocks/service/stock.service';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// Mock the service layer, which is the dependency of the controller
jest.mock('@backend/modules/stocks/service/stock.service');

// Define a mock stock object for consistent testing
const mockStock = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  portfolioId: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  shares: 10,
  avgPrice: 150.0,
  currentPrice: 155.0,
  actualValue: 1550.0,
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const VALID_UUID = 'a8d5e9e0-2c3b-4f1a-8f6f-4d7b3e1a1b2c';

describe('Stock API (Refactored)', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/stocks', () => {
    it('should return 400 if neither portfolioId nor id is provided', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/stocks' });
      // The withValidation middleware will catch the invalid query
      const response = await GET(request, {});
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      // Check for the generic message from the middleware wrapper
      expect(data.error.message).toBe(`Query validation failed - Details: [\n  {\n    \"field\": \"\",\n    \"message\": \"Either id or portfolioId must be provided.\"\n  }\n]`);
      expect(data.error.details).toEqual([
        {
          field: '',
          message: 'Either id or portfolioId must be provided.',
        },
      ]);
    });

    it('should return portfolio stocks when portfolioId is provided', async () => {
      // Arrange: Mock the service layer to return our mock stock
      (stockService.findByPortfolioId as jest.Mock).mockResolvedValue([mockStock]);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { portfolioId: mockStock.portfolioId },
      });
      
      // Act: Call the route handler
      const response = await GET(request, { query: { portfolioId: mockStock.portfolioId } });
      const data = await extractJSON(response);

      // Assert: Check the response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe(mockStock.id);
      expect(stockService.findByPortfolioId).toHaveBeenCalledWith(mockStock.portfolioId);
    });

    it('should return a single stock when id is provided', async () => {
      (stockService.findById as jest.Mock).mockResolvedValue(mockStock);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
      });
      const response = await GET(request, { query: { id: mockStock.id } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockStock.id);
      expect(stockService.findById).toHaveBeenCalledWith(mockStock.id);
    });

    it('should return 404 if stock is not found', async () => {
      (stockService.findById as jest.Mock).mockRejectedValue(new NotFoundError('Stock not found'));

      const request = createMockRequest({
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: VALID_UUID },
      });
      // The withErrorHandler middleware will catch the NotFoundError from the service
      const response = await GET(request, { query: { id: VALID_UUID } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/stocks', () => {
    const validCreateData = {
      portfolioId: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'GOOG',
      name: 'Alphabet Inc.',
      shares: 5,
      avgPrice: 1000.0,
    };

    it('should create a new stock with valid data', async () => {
      (stockService.create as jest.Mock).mockResolvedValue(mockStock);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/stocks',
        body: validCreateData,
      });
      const response = await POST(request, { body: validCreateData });
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockStock.id);
      expect(stockService.create).toHaveBeenCalledWith(validCreateData);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = { ...validCreateData, symbol: '' }; // Invalid symbol
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/stocks',
        body: invalidData,
      });
      const response = await POST(request, {}); // context is populated by middleware
      const data = await extractJSON(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('PUT /api/stocks', () => {
    const updateData = { shares: 20, avgPrice: 155.0 };

    it('should update a stock with valid data', async () => {
      const updatedStock = { ...mockStock, ...updateData };
      (stockService.update as jest.Mock).mockResolvedValue(updatedStock);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/stocks',
        body: { id: mockStock.id, ...updateData },
      });
      const response = await PUT(request, { body: { id: mockStock.id, ...updateData } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.shares).toBe(20);
      expect(stockService.update).toHaveBeenCalledWith(mockStock.id, expect.objectContaining(updateData));
    });

    it('should return 404 when trying to update a non-existent stock', async () => {
      (stockService.update as jest.Mock).mockRejectedValue(new NotFoundError('Stock not found'));
      
      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/stocks',
        body: { id: VALID_UUID, ...updateData },
      });
      const response = await PUT(request, { body: { id: VALID_UUID, ...updateData } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/stocks', () => {
    it('should delete a stock successfully', async () => {
      (stockService.delete as jest.Mock).mockResolvedValue(undefined);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: mockStock.id },
      });
      const response = await DELETE(request, { query: { id: mockStock.id } });

      expect(response.status).toBe(204);
      expect(stockService.delete).toHaveBeenCalledWith(mockStock.id);
    });

    it('should return 404 when trying to delete a non-existent stock', async () => {
      (stockService.delete as jest.Mock).mockRejectedValue(new NotFoundError('Stock not found'));

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/stocks',
        searchParams: { id: VALID_UUID },
      });
      const response = await DELETE(request, { query: { id: VALID_UUID } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
