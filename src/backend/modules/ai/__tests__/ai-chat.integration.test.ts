/**
 * AI Chat Integration Tests
 * 
 * Tests the full flow: Route → Controller → Service → AI Provider
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@app/api/ai/chat/route';
import { chatCacheService } from '@backend/modules/ai/service/chat-cache.service';

// Mock only external dependencies, NOT our services
jest.mock('@lib/auth/session');
jest.mock('@lib/tiers');
jest.mock('@lib/ai/confidence-router');
jest.mock('@lib/telemetry/ai-logger');

import { getUserProfile } from '@lib/auth/session';
import { checkQuota, trackUsage } from '@lib/tiers';
import { routeQueryWithConfidence } from '@lib/ai/confidence-router';
import { getTelemetryStats } from '@lib/telemetry/ai-logger';

describe('AI Chat Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chatCacheService.clear();

    // Default mocks
    (getUserProfile as jest.Mock).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      tier: 'free',
    });

    (checkQuota as jest.Mock).mockResolvedValue({
      allowed: true,
    });
  });

  describe('POST /api/ai/chat', () => {
    it('should process chat request successfully', async () => {
      const mockAIResponse = {
        text: 'This is a test response about stocks.',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: ['source1'],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Tell me about stocks',
          ragContext: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('This is a test response about stocks.');
      expect(data.cached).toBe(false);
      expect(data.confidence).toBe(0.90);
      
      // Verify quota was checked and tracked
      expect(checkQuota).toHaveBeenCalledWith('user-123', 'chatQuery', 'free');
      expect(trackUsage).toHaveBeenCalledWith('user-123', 'chatQuery', 'free');
    });

    it('should return cached response without quota check', async () => {
      const mockAIResponse = {
        text: 'Cached answer',
        confidence: 0.95,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      const requestBody = {
        message: 'What is a stock?',
        ragContext: '',
      };

      // First request - generates and caches
      const request1 = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response1 = await POST(request1);
      if (response1.status !== 200) {
        const errorData = await response1.json();
        console.log('First request failed:', { status: response1.status, errorData });
      }
      expect(response1.status).toBe(200);

      // Clear mocks
      (checkQuota as jest.Mock).mockClear();
      (trackUsage as jest.Mock).mockClear();
      (routeQueryWithConfidence as jest.Mock).mockClear();

      // Second request with same body - should hit cache
      const request2 = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request2);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
      expect(data.cacheAge).toBeDefined();
      
      // Verify quota was NOT checked for cached response
      expect(checkQuota).not.toHaveBeenCalled();
      // Verify AI was NOT called again
      expect(routeQueryWithConfidence).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      (getUserProfile as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Authentication required');
    });

    it('should return 400 for invalid request', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          // Missing message field
          portfolioId: 'p1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Validation failed');
      expect(data.error.details).toBeDefined();
    });

    it('should return 429 if quota exceeded', async () => {
      (checkQuota as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Daily limit of 10 queries exceeded',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('QUOTA_EXCEEDED');
      expect(data.error.message).toContain('Daily limit');
    });

    it('should bypass cache when requested', async () => {
      const mockAIResponse = {
        text: 'Fresh answer',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      const requestBody1 = {
        message: 'test',
        ragContext: '',
      };

      // First request - cache it
      const request1 = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody1),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Clear AI mock
      (routeQueryWithConfidence as jest.Mock).mockClear();

      // Second request - bypass cache
      const requestBody2 = {
        message: 'test',
        ragContext: '',
        bypassCache: true,
      };

      const request2 = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody2),
      });

      const response = await POST(request2);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(false);
      expect(routeQueryWithConfidence).toHaveBeenCalled();
    });

    it('should include portfolio context in AI call', async () => {
      const mockAIResponse = {
        text: 'Portfolio analysis',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 100, output: 200, total: 300 },
        latencyMs: 400,
        escalated: false,
        cost: 0.0002,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Analyze my portfolio',
          portfolio: {
            symbols: ['AAPL', 'MSFT', 'GOOGL'],
            totalValue: 150000,
          },
          ragContext: 'Recent news about tech stocks',
        }),
      });

      await POST(request);

      expect(routeQueryWithConfidence).toHaveBeenCalledWith({
        userMessage: 'Analyze my portfolio',
        ragContext: 'Recent news about tech stocks',
        portfolio: {
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
          totalValue: 150000,
        },
      });
    });

    it('should handle AI service errors gracefully', async () => {
      (routeQueryWithConfidence as jest.Mock).mockRejectedValue(
        new Error('AI service timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('AI service timeout');
    });

    // P1: Critical test for check-then-track separation
    it('should NOT track usage when handler returns error (check-then-track separation)', async () => {
      const mockAIResponse = {
        text: 'Error response',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      // Mock AI service to return success but we'll verify tracking behavior
      (routeQueryWithConfidence as jest.Mock).mockRejectedValue(
        new Error('AI processing failed')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test message that will fail',
        }),
      });

      const response = await POST(request);

      // Verify request failed (4xx or 5xx)
      expect(response.status).toBeGreaterThanOrEqual(400);

      // CRITICAL: Verify usage was NOT tracked on failure
      expect(trackUsage).not.toHaveBeenCalled();
    });

    it('should track usage only after successful handler execution', async () => {
      const mockAIResponse = {
        text: 'Successful response',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'successful test',
        }),
      });

      const response = await POST(request);

      // Verify request succeeded
      expect(response.status).toBe(200);

      // CRITICAL: Verify quota was checked BEFORE handler
      expect(checkQuota).toHaveBeenCalledWith('user-123', 'chatQuery', 'free');

      // CRITICAL: Verify usage was tracked AFTER successful response
      expect(trackUsage).toHaveBeenCalledWith('user-123', 'chatQuery', 'free');

      // Verify the order: checkQuota should be called before trackUsage
      const checkQuotaCallOrder = (checkQuota as jest.Mock).mock.invocationCallOrder[0];
      const trackUsageCallOrder = (trackUsage as jest.Mock).mock.invocationCallOrder[0];
      expect(checkQuotaCallOrder).toBeLessThan(trackUsageCallOrder);
    });

    // P1: Critical test for tracking failure resiliency
    it('should succeed even if usage tracking fails (resiliency)', async () => {
      const mockAIResponse = {
        text: 'This is a successful response',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      // Mock trackUsage to fail
      (trackUsage as jest.Mock).mockRejectedValue(
        new Error('Database connection failed during tracking')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // CRITICAL: Request should still succeed even though tracking failed
      expect(response.status).toBe(200);
      expect(data.text).toBe('This is a successful response');

      // Verify trackUsage was attempted
      expect(trackUsage).toHaveBeenCalledWith('user-123', 'chatQuery', 'free');
    });

    it('should handle multiple tracking failures gracefully', async () => {
      const mockAIResponse = {
        text: 'Response text',
        confidence: 0.90,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        tokensUsed: { input: 50, output: 100, total: 150 },
        latencyMs: 300,
        escalated: false,
        cost: 0.0001,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);

      // Mock trackUsage to fail with different errors
      const trackingErrors = [
        new Error('RPC timeout'),
        new Error('Supabase connection lost'),
        new Error('Network error'),
      ];

      for (const error of trackingErrors) {
        (trackUsage as jest.Mock).mockRejectedValueOnce(error);
        (checkQuota as jest.Mock).mockResolvedValue({ allowed: true });

        const request = new NextRequest('http://localhost:3000/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: `test ${error.message}`,
          }),
        });

        const response = await POST(request);

        // Each request should succeed despite tracking failure
        expect(response.status).toBe(200);
      }

      // Verify all tracking attempts were made
      expect(trackUsage).toHaveBeenCalledTimes(trackingErrors.length);
    });
  });

  describe('GET /api/ai/chat/stats', () => {
    it('should return chat statistics', async () => {
      const mockStats = {
        totalInferences: 50,
        cacheHits: 15,
        totalCost: 0.25,
        cacheSize: 10,
      };

      (getTelemetryStats as jest.Mock).mockReturnValue({
        totalInferences: 50,
        cacheHits: 15,
        totalCost: 0.25,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats.totalInferences).toBe(50);
      expect(data.data.cacheSize).toBeDefined();
    });
  });
});
