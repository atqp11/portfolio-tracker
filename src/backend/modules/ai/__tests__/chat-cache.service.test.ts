/**
 * Chat Cache Service Tests
 * 
 * Unit tests for ChatCacheService
 */

import { ChatCacheService } from '@backend/modules/ai/service/chat-cache.service';
import type { ChatCacheEntry } from '@backend/modules/ai/dto/chat.dto';

describe('ChatCacheService', () => {
  let cacheService: ChatCacheService;

  beforeEach(() => {
    cacheService = new ChatCacheService(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    cacheService.clear();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = cacheService.generateCacheKey('test message', 'portfolio-123');
      const key2 = cacheService.generateCacheKey('test message', 'portfolio-123');
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different messages', () => {
      const key1 = cacheService.generateCacheKey('message 1', 'portfolio-123');
      const key2 = cacheService.generateCacheKey('message 2', 'portfolio-123');
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different portfolios', () => {
      const key1 = cacheService.generateCacheKey('test message', 'portfolio-123');
      const key2 = cacheService.generateCacheKey('test message', 'portfolio-456');
      
      expect(key1).not.toBe(key2);
    });

    it('should normalize message case', () => {
      const key1 = cacheService.generateCacheKey('Test Message', 'portfolio-123');
      const key2 = cacheService.generateCacheKey('test message', 'portfolio-123');
      
      expect(key1).toBe(key2);
    });

    it('should handle missing portfolioId', () => {
      const key1 = cacheService.generateCacheKey('test message');
      const key2 = cacheService.generateCacheKey('test message', undefined);
      
      expect(key1).toBe(key2);
    });
  });

  describe('get/set', () => {
    it('should store and retrieve cache entry', () => {
      const key = cacheService.generateCacheKey('test', 'p1');
      const entry: ChatCacheEntry = {
        response: 'Test response',
        confidence: 0.9,
        model: 'gemini-2.0-flash-exp',
        sources: ['source1'],
        timestamp: Date.now(),
      };

      cacheService.set(key, entry);
      const result = cacheService.get(key);

      expect(result).not.toBeNull();
      expect(result!.entry).toEqual(entry);
      expect(result!.age).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent key', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const key = cacheService.generateCacheKey('test', 'p1');
      const entry: ChatCacheEntry = {
        response: 'Test response',
        confidence: 0.9,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        timestamp: Date.now(),
      };

      cacheService.set(key, entry);
      
      // Wait for expiration (TTL is 1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should remove expired entry on get', async () => {
      const key = cacheService.generateCacheKey('test', 'p1');
      const entry: ChatCacheEntry = {
        response: 'Test response',
        confidence: 0.9,
        model: 'gemini-2.0-flash-exp',
        sources: [],
        timestamp: Date.now(),
      };

      cacheService.set(key, entry);
      expect(cacheService.getSize()).toBe(1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      cacheService.get(key);
      expect(cacheService.getSize()).toBe(0);
    });
  });

  describe('getSize', () => {
    it('should return 0 for empty cache', () => {
      expect(cacheService.getSize()).toBe(0);
    });

    it('should return correct size', () => {
      const entry: ChatCacheEntry = {
        response: 'Test',
        confidence: 0.9,
        model: 'test',
        sources: [],
        timestamp: Date.now(),
      };

      cacheService.set('key1', entry);
      cacheService.set('key2', entry);
      
      expect(cacheService.getSize()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const entry: ChatCacheEntry = {
        response: 'Test',
        confidence: 0.9,
        model: 'test',
        sources: [],
        timestamp: Date.now(),
      };

      cacheService.set('key1', entry);
      cacheService.set('key2', entry);
      
      expect(cacheService.getSize()).toBe(2);
      
      cacheService.clear();
      
      expect(cacheService.getSize()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove only expired entries', async () => {
      const entry1: ChatCacheEntry = {
        response: 'Old',
        confidence: 0.9,
        model: 'test',
        sources: [],
        timestamp: Date.now() - 2000, // 2 seconds ago (expired)
      };

      const entry2: ChatCacheEntry = {
        response: 'New',
        confidence: 0.9,
        model: 'test',
        sources: [],
        timestamp: Date.now(), // Fresh
      };

      cacheService.set('old-key', entry1);
      cacheService.set('new-key', entry2);
      
      expect(cacheService.getSize()).toBe(2);
      
      const removed = cacheService.cleanup();
      
      expect(removed).toBe(1);
      expect(cacheService.getSize()).toBe(1);
      expect(cacheService.get('new-key')).not.toBeNull();
    });

    it('should return 0 if no expired entries', () => {
      const entry: ChatCacheEntry = {
        response: 'Fresh',
        confidence: 0.9,
        model: 'test',
        sources: [],
        timestamp: Date.now(),
      };

      cacheService.set('key1', entry);
      
      const removed = cacheService.cleanup();
      
      expect(removed).toBe(0);
      expect(cacheService.getSize()).toBe(1);
    });
  });
});
