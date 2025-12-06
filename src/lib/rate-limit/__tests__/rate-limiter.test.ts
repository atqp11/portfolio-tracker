import { checkRateLimit, RATE_LIMITS } from '../rate-limiter';

// Mock Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    multi: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([null, 'OK']),
  })),
}));

describe('Rate Limiter', () => {
  const testUserId = 'test-user-123';

  it('should allow requests within limit', async () => {
    const result = await checkRateLimit(testUserId, 'default');
    expect(result.success).toBe(true);
    expect(result.remaining).toBeLessThanOrEqual(result.limit);
  });

  it('should use correct limits for AI endpoints', async () => {
    const result = await checkRateLimit(testUserId, 'ai');
    expect(result.limit).toBe(RATE_LIMITS.ai.requests);
  });

  it('should fail open if redis is down', async () => {
    const { Redis } = require('@upstash/redis');
    Redis.mockImplementationOnce(() => ({
      get: jest.fn().mockRejectedValue(new Error('Redis is down')),
    }));
    const result = await checkRateLimit(testUserId, 'default');
    expect(result.success).toBe(true);
  });
});
