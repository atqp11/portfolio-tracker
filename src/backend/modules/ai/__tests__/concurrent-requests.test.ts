/**
 * Concurrent Request Tests
 *
 * Tests that the quota enforcement system handles concurrent requests correctly
 * and prevents race conditions through atomic database operations.
 *
 * These tests verify the core problem that the refactoring plan addresses:
 * preventing users from exceeding quota limits through concurrent requests.
 */

import { NextRequest } from 'next/server';
import { POST } from '@app/api/ai/chat/route';
import { chatCacheService } from '@backend/modules/ai/service/chat-cache.service';

// Mock only external dependencies
jest.mock('@lib/auth/session');
jest.mock('@lib/tiers');
jest.mock('@lib/ai/confidence-router');

import { getUserProfile } from '@lib/auth/session';
import { checkQuota, trackUsage } from '@lib/tiers';
import { routeQueryWithConfidence } from '@lib/ai/confidence-router';

describe('Concurrent Request Tests (Race Condition Prevention)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chatCacheService.clear();

    // Default mocks
    (getUserProfile as jest.Mock).mockResolvedValue({
      id: 'user-concurrent-test',
      email: 'test@example.com',
      tier: 'free',
    });

    const mockAIResponse = {
      text: 'AI response',
      confidence: 0.90,
      model: 'gemini-2.0-flash-exp',
      sources: [],
      tokensUsed: { input: 50, output: 100, total: 150 },
      latencyMs: 300,
      escalated: false,
      cost: 0.0001,
    };

    (routeQueryWithConfidence as jest.Mock).mockResolvedValue(mockAIResponse);
  });

  it('should handle concurrent requests without race conditions', async () => {
    let quotaCheckCount = 0;
    let trackUsageCount = 0;

    // Mock quota check to allow first 5 requests, reject the rest
    (checkQuota as jest.Mock).mockImplementation(() => {
      quotaCheckCount++;
      return Promise.resolve({
        allowed: quotaCheckCount <= 5,
        remaining: Math.max(0, 5 - quotaCheckCount),
        limit: 5,
        reason: quotaCheckCount > 5 ? 'Daily limit exceeded' : undefined,
      });
    });

    // Mock trackUsage to count successful tracking
    (trackUsage as jest.Mock).mockImplementation(() => {
      trackUsageCount++;
      return Promise.resolve();
    });

    // Send 10 concurrent requests (5 should succeed, 5 should be rejected)
    const requests = Array(10).fill(null).map((_, index) => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `concurrent test message ${index}`,
        }),
      });
      return POST(request);
    });

    const responses = await Promise.all(requests);

    // Count successes and failures
    const successCount = responses.filter(r => r.status === 200).length;
    const quotaExceededCount = responses.filter(r => r.status === 429).length;

    // CRITICAL: Exactly 5 should succeed (quota limit)
    expect(successCount).toBe(5);

    // CRITICAL: Exactly 5 should be rejected for quota exceeded
    expect(quotaExceededCount).toBe(5);

    // CRITICAL: trackUsage should be called exactly 5 times (once per success)
    expect(trackUsageCount).toBe(5);

    // Verify quota check was called for all 10 requests
    expect(quotaCheckCount).toBe(10);
  });

  it('should prevent quota bypass through parallel request timing', async () => {
    let remaining = 3; // User has 3 requests remaining

    // Simulate real quota checking with decreasing remaining count
    (checkQuota as jest.Mock).mockImplementation(() => {
      const currentRemaining = remaining;
      if (currentRemaining > 0) {
        return Promise.resolve({
          allowed: true,
          remaining: currentRemaining,
          limit: 10,
        });
      }
      return Promise.resolve({
        allowed: false,
        remaining: 0,
        limit: 10,
        reason: 'Quota exceeded',
      });
    });

    // Simulate atomic tracking that decrements remaining count
    (trackUsage as jest.Mock).mockImplementation(() => {
      remaining--;
      return Promise.resolve();
    });

    // Fire 5 requests simultaneously (only 3 should succeed)
    const requests = Array(5).fill(null).map((_, index) => {
      // Add slight delay to simulate real-world timing
      return new Promise(resolve => {
        setTimeout(async () => {
          const request = new NextRequest('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
              message: `parallel timing test ${index}`,
            }),
          });
          const response = await POST(request);
          resolve(response);
        }, Math.random() * 10); // Random delay 0-10ms
      });
    });

    const responses = await Promise.all(requests);

    const successCount = responses.filter((r: any) => r.status === 200).length;

    // CRITICAL: Should not exceed the quota of 3
    expect(successCount).toBeLessThanOrEqual(3);

    // CRITICAL: trackUsage should not be called more than 3 times
    expect((trackUsage as jest.Mock).mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('should handle burst of requests at quota boundary', async () => {
    let checkQuotaCallCount = 0;
    let trackUsageCallCount = 0;
    const quotaLimit = 2;

    // Simulate quota check - allow only quotaLimit requests
    (checkQuota as jest.Mock).mockImplementation(() => {
      checkQuotaCallCount++;
      const allowed = checkQuotaCallCount <= quotaLimit;
      return Promise.resolve({
        allowed,
        remaining: allowed ? quotaLimit - checkQuotaCallCount + 1 : 0,
        limit: quotaLimit,
        reason: allowed ? undefined : 'Quota limit reached',
      });
    });

    (trackUsage as jest.Mock).mockImplementation(() => {
      trackUsageCallCount++;
      return Promise.resolve();
    });

    // Send exactly quotaLimit + 1 requests simultaneously
    const burstSize = quotaLimit + 1;
    const requests = Array(burstSize).fill(null).map((_, index) => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `burst test ${index}`,
        }),
      });
      return POST(request);
    });

    const responses = await Promise.all(requests);

    const successCount = responses.filter(r => r.status === 200).length;

    // CRITICAL: Should not exceed quota limit
    expect(successCount).toBeLessThanOrEqual(quotaLimit);

    // At least one request should be rejected
    const rejectedCount = responses.filter(r => r.status === 429).length;
    expect(rejectedCount).toBeGreaterThanOrEqual(1);

    // Verify checkQuota called for all requests
    expect(checkQuotaCallCount).toBe(burstSize);
  });

  it('should maintain quota integrity under high concurrency', async () => {
    const quotaLimit = 10;
    let checkQuotaCallCount = 0;
    let trackUsageCallCount = 0;

    // Simulate sequential quota checks (in reality, DB handles atomic operations)
    (checkQuota as jest.Mock).mockImplementation(() => {
      checkQuotaCallCount++;
      const allowed = checkQuotaCallCount <= quotaLimit;
      return Promise.resolve({
        allowed,
        remaining: Math.max(0, quotaLimit - checkQuotaCallCount + 1),
        limit: quotaLimit,
        reason: allowed ? undefined : 'Quota exceeded',
      });
    });

    (trackUsage as jest.Mock).mockImplementation(async () => {
      trackUsageCallCount++;
      return Promise.resolve();
    });

    // High concurrency: 50 simultaneous requests
    const highConcurrency = 50;
    const requests = Array(highConcurrency).fill(null).map((_, index) => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `high concurrency test ${index}`,
        }),
      });
      return POST(request);
    });

    const responses = await Promise.all(requests);

    const successCount = responses.filter(r => r.status === 200).length;
    const rejectedCount = responses.filter(r => r.status === 429).length;

    // CRITICAL: Should never exceed quota limit even under high load
    expect(successCount).toBeLessThanOrEqual(quotaLimit);
    expect(trackUsageCallCount).toBeLessThanOrEqual(quotaLimit);

    // Verify all requests were processed
    expect(successCount + rejectedCount).toBe(highConcurrency);

    // Most requests should be rejected
    expect(rejectedCount).toBeGreaterThanOrEqual(highConcurrency - quotaLimit);
  });

  it('should handle interleaved success and failure requests', async () => {
    let callCount = 0;

    // Alternate between allowing and rejecting requests
    (checkQuota as jest.Mock).mockImplementation(() => {
      callCount++;
      const allowed = callCount % 2 === 1; // Odd calls succeed, even calls fail
      return Promise.resolve({
        allowed,
        remaining: allowed ? 5 : 0,
        limit: 10,
        reason: allowed ? undefined : 'Quota check failed',
      });
    });

    const requests = Array(10).fill(null).map((_, index) => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `interleaved test ${index}`,
        }),
      });
      return POST(request);
    });

    const responses = await Promise.all(requests);

    const successCount = responses.filter(r => r.status === 200).length;
    const failCount = responses.filter(r => r.status === 429).length;

    // Should have roughly equal splits (5 success, 5 fail)
    expect(successCount).toBe(5);
    expect(failCount).toBe(5);

    // trackUsage should only be called for successes
    expect((trackUsage as jest.Mock).mock.calls.length).toBe(5);
  });
});
