/**
 * Chat Service Tests
 * 
 * Unit tests for ChatService
 */

import { ChatService } from '@backend/modules/ai/service/chat.service';
import { chatCacheService } from '@backend/modules/ai/service/chat-cache.service';
import type { ChatRequestDto, ChatResponseDto } from '@backend/modules/ai/dto/chat.dto';

// Mock dependencies
jest.mock('@lib/ai/confidence-router');
jest.mock('@lib/telemetry/ai-logger');
jest.mock('../service/chat-cache.service');

import { routeQueryWithConfidence } from '@lib/ai/confidence-router';
import { logInference, getTelemetryStats } from '@lib/telemetry/ai-logger';

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();
    jest.clearAllMocks();
  });

  describe('checkCache', () => {
    it('should return null if bypassCache is true', async () => {
      const request: ChatRequestDto = {
        message: 'test message',
        bypassCache: true,
        ragContext: '',
      };

      const result = await chatService.checkCache(request);
      
      expect(result).toBeNull();
      expect(chatCacheService.get).not.toHaveBeenCalled();
    });

    it('should return cached response if available', async () => {
      const request: ChatRequestDto = {
        message: 'test message',
        bypassCache: false,
        ragContext: '',
      };

      const cachedEntry = {
        response: 'cached answer',
        confidence: 0.95,
        model: 'gemini-2.0-flash-exp',
        sources: ['source1'],
        timestamp: Date.now(),
      };

      (chatCacheService.generateCacheKey as jest.Mock).mockReturnValue('test-key');
      (chatCacheService.get as jest.Mock).mockReturnValue({
        entry: cachedEntry,
        age: 1000,
      });

      const result = await chatService.checkCache(request);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('cached answer');
      expect(result!.cached).toBe(true);
      expect(result!.cacheAge).toBe(1000);
      expect(logInference).toHaveBeenCalledWith(
        expect.objectContaining({
          cache_hit: true,
          cost_usd: 0,
        })
      );
    });

    it('should return null if cache miss', async () => {
      const request: ChatRequestDto = {
        message: 'test message',
        bypassCache: false,
        ragContext: '',
      };

      (chatCacheService.generateCacheKey as jest.Mock).mockReturnValue('test-key');
      (chatCacheService.get as jest.Mock).mockReturnValue(null);

      const result = await chatService.checkCache(request);

      expect(result).toBeNull();
    });
  });

  describe('generateResponse', () => {
    it('should generate fresh response and cache it', async () => {
      const request: ChatRequestDto = {
        message: 'What is the stock market?',
        ragContext: 'Some context',
        bypassCache: false,
        portfolio: {
          symbols: ['AAPL', 'GOOGL'],
          totalValue: 100000,
        },
      };

      const mockAIResponse = {
        text: 'The stock market is...',
        confidence: 0.92,
        model: 'gemini-2.0-flash-exp',
        sources: ['source1', 'source2'],
        tokensUsed: { input: 100, output: 200, total: 300 },
        latencyMs: 500,
        escalated: false,
        cost: 0.00015,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);
      (chatCacheService.generateCacheKey as jest.Mock).mockReturnValue('test-key');

      const result = await chatService.generateResponse(request, 'user-123', 'free');

      expect(result.text).toBe('The stock market is...');
      expect(result.cached).toBe(false);
      expect(result.confidence).toBe(0.92);
      
      // Verify AI router was called with correct context
      expect(routeQueryWithConfidence).toHaveBeenCalledWith({
        userMessage: 'What is the stock market?',
        ragContext: 'Some context',
        portfolio: {
          symbols: ['AAPL', 'GOOGL'],
          totalValue: 100000,
        },
      });

      // Verify response was cached
      expect(chatCacheService.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({
          response: 'The stock market is...',
          confidence: 0.92,
          model: 'gemini-2.0-flash-exp',
        })
      );

      // Verify telemetry was logged
      expect(logInference).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.0-flash-exp',
          taskType: 'chat',
          confidence: 0.92,
          cost_usd: 0.00015,
          cache_hit: false,
        })
      );
    });

    it('should handle AI escalation', async () => {
      const request: ChatRequestDto = {
        message: 'Complex financial question',
        ragContext: '',
        bypassCache: false,
      };

      const mockAIResponse = {
        text: 'Detailed answer...',
        confidence: 0.88,
        model: 'gemini-1.5-pro',
        sources: [],
        tokensUsed: { input: 150, output: 300, total: 450 },
        latencyMs: 1200,
        escalated: true,
        cost: 0.002,
      };

      (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);
      (chatCacheService.generateCacheKey as jest.Mock).mockReturnValue('test-key');

      const result = await chatService.generateResponse(request, 'user-123', 'premium');

      expect(result.escalated).toBe(true);
      expect(result.model).toBe('gemini-1.5-pro');
      expect(logInference).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-pro',
          escalated: true,
        })
      );
    });

    it('should handle errors and log them', async () => {
      const request: ChatRequestDto = {
        message: 'test',
        ragContext: '',
        bypassCache: false,
      };

      const error = new Error('AI service unavailable');
      (routeQueryWithConfidence as jest.Mock).mockRejectedValue(error);

      await expect(
        chatService.generateResponse(request, 'user-123', 'free')
      ).rejects.toThrow('AI service unavailable');
    });
  });

  describe('getChatStats', () => {
    it('should return stats and cache size', async () => {
      const mockStats = {
        totalInferences: 100,
        cacheHits: 30,
        totalCost: 0.50,
      };

      (getTelemetryStats as jest.Mock).mockReturnValue(mockStats);
      (chatCacheService.getSize as jest.Mock).mockReturnValue(25);

      const result = await chatService.getChatStats();

      expect(result.stats).toEqual(mockStats);
      expect(result.cacheSize).toBe(25);
    });
  });

  describe('logError', () => {
    it('should log error with telemetry', () => {
      const error = new Error('Test error');
      const startTime = Date.now() - 100;

      chatService.logError(error, startTime);

      expect(logInference).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'unknown',
          error: 'Test error',
          cost_usd: 0,
          cache_hit: false,
        })
      );
    });
  });
});
