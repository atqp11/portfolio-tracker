import { requireUser } from '@lib/auth/session';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import RiskMetricsClient from './RiskMetricsClient';
import type { Stock } from '@lib/client/types';

/**
 * Fetch stocks for a portfolio type
 */
async function getStocksForPortfolio(portfolioType: 'energy' | 'copper'): Promise<Stock[]> {
  try {
    const portfolios = await portfolioService.findAll({ includeRelations: true });
    const portfolio = portfolios.find((p: any) => p.type === portfolioType);

    if (!portfolio || !portfolio.stocks) {
      return [];
    }

    return portfolio.stocks as Stock[];
  } catch (error) {
    console.error(`Error fetching stocks for ${portfolioType}:`, error);
    return [];
  }
}

/**
 * Risk Metrics Test Page - Server Component
 *
 * Demonstrates risk metric calculations for portfolio analysis:
 * - Sharpe Ratio (risk-adjusted returns)
 * - Sortino Ratio (downside risk)
 * - Alpha (excess returns vs benchmark)
 * - Beta (market correlation)
 * - Calmar Ratio (return vs drawdown)
 * - Volatility metrics (std dev, max drawdown)
 *
 * Architecture:
 * - Server Component for data fetching
 * - Auth via requireUser()
 * - Data fetched via service layer
 * - Calculations delegated to Client Component via Server Actions
 * - No business logic in page
 */
export default async function TestRiskMetricsPage() {
  // 1. Auth check
  await requireUser();

  // 2. Fetch portfolio data via service layer
  const portfolioType: 'energy' | 'copper' = 'energy';
  const stocks = await getStocksForPortfolio(portfolioType);

  // 3. Pass data to Client Component
  return <RiskMetricsClient initialStocks={stocks} portfolioType={portfolioType} />;
}
