import { NextRequest } from 'next/server';
import { POST } from '@app/api/risk-metrics/route';
import { getUserProfile } from '@lib/auth/session';
import { checkAndTrackUsage } from '@lib/tiers';
import * as calc from '@lib/calculator';

jest.mock('@lib/auth/session');
jest.mock('@lib/tiers');
jest.mock('@lib/calculator');

const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockCheckAndTrackUsage = checkAndTrackUsage as jest.MockedFunction<typeof checkAndTrackUsage>;
const mockCalc = calc as jest.Mocked<typeof calc>;

describe('Risk Metrics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns calculated metrics for authenticated user', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'user-1', tier: 'free' } as any);
    mockCheckAndTrackUsage.mockResolvedValue({ allowed: true } as any);

    mockCalc.calculateSharpeRatio.mockReturnValue(1.0 as any);
    mockCalc.calculateSortinoRatio.mockReturnValue(0.8 as any);
    mockCalc.calculateStdDev.mockReturnValue(0.12 as any);
    mockCalc.calculateMaxDrawdown.mockReturnValue(0.2 as any);
    mockCalc.calculateCurrentDrawdown.mockReturnValue(0.05 as any);
    mockCalc.calculateBeta.mockReturnValue(1.05 as any);
    mockCalc.calculateAlpha.mockReturnValue(0.02 as any);
    mockCalc.calculateRSquared.mockReturnValue(0.88 as any);

    const body = {
      portfolioReturns: [0.01, 0.02, -0.01],
      marketReturns: [0.005, 0.015, -0.005],
    };

    const req = new NextRequest('http://localhost:3000/api/risk-metrics', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sharpe).toBe(1.0);
    expect(data.beta).toBe(1.05);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUserProfile.mockResolvedValue(null as any);

    const req = new NextRequest('http://localhost:3000/api/risk-metrics', { method: 'POST', body: JSON.stringify({ portfolioReturns: [0.01], marketReturns: [0.005] }), headers: { 'Content-Type': 'application/json' } });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 when quota exceeded', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'user-1', tier: 'free' } as any);
    mockCheckAndTrackUsage.mockResolvedValue({ allowed: false, reason: 'Daily limit' } as any);

    const req = new NextRequest('http://localhost:3000/api/risk-metrics', { method: 'POST', body: JSON.stringify({ portfolioReturns: [0.01], marketReturns: [0.005] }), headers: { 'Content-Type': 'application/json' } });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
