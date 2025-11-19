import { NextRequest } from 'next/server';
import { calculateSharpeRatio, calculateSortinoRatio, calculateAlpha, calculateBeta, calculateStdDev, calculateMaxDrawdown, calculateCurrentDrawdown, calculateRSquared, RiskMetrics } from '@/lib/calculator';

// Example: expects JSON body with { portfolioReturns, marketReturns, riskFreeRate, marketReturn, portfolioReturn, beta }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { portfolioReturns, marketReturns, riskFreeRate = 0.045, marketReturn, portfolioReturn, beta } = body;

  // Defensive: ensure arrays
  if (!Array.isArray(portfolioReturns) || !Array.isArray(marketReturns)) {
    return new Response(JSON.stringify({ error: 'portfolioReturns and marketReturns must be arrays' }), { status: 400 });
  }

  // Compute metrics
  const sharpe = calculateSharpeRatio(portfolioReturns, riskFreeRate);
  const sortino = calculateSortinoRatio(portfolioReturns, riskFreeRate);
  const stdDev = calculateStdDev(portfolioReturns);
  const maxDrawdown = calculateMaxDrawdown(portfolioReturns);
  const currentDrawdown = calculateCurrentDrawdown(portfolioReturns);
  const betaVal = calculateBeta(portfolioReturns, marketReturns);
  const alphaVal = calculateAlpha(
    typeof portfolioReturn === 'number' ? portfolioReturn : (portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length),
    typeof marketReturn === 'number' ? marketReturn : (marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length),
    typeof beta === 'number' ? beta : betaVal || 1,
    riskFreeRate
  );
  const rSquared = calculateRSquared(portfolioReturns, marketReturns);
  const calmar = maxDrawdown && maxDrawdown > 0 && typeof portfolioReturn === 'number'
    ? portfolioReturn / maxDrawdown
    : null;

  const result: RiskMetrics = {
    sharpe,
    sortino,
    alpha: alphaVal,
    beta: betaVal,
    calmar,
    stdDev,
    maxDrawdown,
    currentDrawdown,
    rSquared,
  };

  return new Response(JSON.stringify(result), { status: 200 });
}
