import { requireUser } from '@lib/auth/session';
import { fetchThesesForPortfolio, fetchPortfolioData } from './actions';
import ThesisClient from './ThesisClient';

/**
 * Thesis Page - Server Component
 *
 * Follows RSC pattern from 0_AI_Coding_Agent_Guide.md:
 * - Server Component for data fetching
 * - Auth via requireUser()
 * - Data fetched via server actions (which call services)
 * - Interactivity delegated to Client Component
 * - No business logic in page
 * - No direct service/repository imports
 */
export default async function ThesisPage() {
  // 1. Auth check (RSC pattern - section 6)
  await requireUser();

  // 2. Fetch data via server actions (which call service layer with DTO handling)
  const [
    dbEnergyTheses,
    dbCopperTheses,
    energyPortfolioData,
    copperPortfolioData,
  ] = await Promise.all([
    fetchThesesForPortfolio('energy'),
    fetchThesesForPortfolio('copper'),
    fetchPortfolioData('energy'),
    fetchPortfolioData('copper'),
  ]);

  // 3. Generate fallback theses if none exist in database (preserve old behavior)
  const generateDefaultTheses = (portfolioType: 'energy' | 'copper', portfolioData: any) => {
    const marginUsed = portfolioData?.borrowedAmount || (portfolioType === 'energy' ? 6000 : 3000);
    const currentValue = portfolioData?.initialValue || (portfolioType === 'energy' ? 20000 : 10000);
    const targetDeleverValue = portfolioType === 'energy' ? 30000 : 15000;
    const equityPercent = currentValue > 0 ? ((currentValue - marginUsed) / currentValue) * 100 : 0;

    return [
      {
        id: `thesis_${portfolioType}_margin`,
        portfolioId: portfolioData?.id || portfolioType,
        ticker: `${portfolioType.toUpperCase()}_PORTFOLIO`,
        title: 'Margin Decision',
        description: `30% margin ($${marginUsed.toLocaleString()} borrowed). Leverages market opportunities with managed risk.`,
        rationale: `All positions have strong fundamentals. Margin call triggers if equity drops below 30%.`,
        bearCase: `Market crash, margin call if equity < 30%`,
        risks: ['Market volatility', 'Margin call risk'],
        keyMetrics: [
          {
            name: 'Equity Percentage',
            targetValue: '>45%',
            currentValue: `${equityPercent.toFixed(1)}%`,
            condition: 'Must stay above 45%, margin call at 30%',
            urgency: (equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
          },
        ],
        stopLossRules: [
          {
            type: 'margin_call' as const,
            trigger: `Equity drops below 30%`,
            action: 'Immediately sell positions to meet margin requirements',
            currentDistance: equityPercent > 30 ? `${(equityPercent - 30).toFixed(1)}% buffer` : 'TRIGGERED',
          },
        ],
        exitCriteria: {
          targetValue: targetDeleverValue,
          profitTarget: 150,
          conditions: [`Portfolio reaches $${targetDeleverValue.toLocaleString()}`],
        },
        thesisHealthScore: equityPercent < 30 ? 25 : equityPercent < 40 ? 60 : 90,
        urgency: (equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
        lastValidated: null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `thesis_${portfolioType}_delever`,
        portfolioId: portfolioData?.id || portfolioType,
        ticker: `${portfolioType.toUpperCase()}_PORTFOLIO`,
        title: 'Delever Decision',
        description: `Trigger at $${targetDeleverValue.toLocaleString()} (+50%). Sell $${marginUsed.toLocaleString()} to repay margin.`,
        rationale: 'Lock in gains and eliminate leverage risk.',
        bearCase: null,
        risks: [],
        keyMetrics: [
          {
            name: 'Distance to Target',
            targetValue: `$${targetDeleverValue.toLocaleString()}`,
            currentValue: `$${currentValue.toFixed(0)}`,
            condition: `${((currentValue / targetDeleverValue) * 100).toFixed(1)}% of target`,
            urgency: (currentValue >= targetDeleverValue * 0.9 ? 'red' : 'green') as 'green' | 'yellow' | 'red',
          },
        ],
        stopLossRules: [],
        exitCriteria: {
          targetValue: targetDeleverValue,
          profitTarget: 150,
          conditions: [`Value reaches $${targetDeleverValue.toLocaleString()}`],
        },
        thesisHealthScore: currentValue >= targetDeleverValue * 0.9 ? 30 : 90,
        urgency: (currentValue >= targetDeleverValue * 0.9 ? 'red' : 'green') as 'green' | 'yellow' | 'red',
        lastValidated: null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  };

  // Use database theses or fallback to defaults
  const energyTheses = dbEnergyTheses.length > 0 ? dbEnergyTheses : generateDefaultTheses('energy', energyPortfolioData);
  const copperTheses = dbCopperTheses.length > 0 ? dbCopperTheses : generateDefaultTheses('copper', copperPortfolioData);

  // 4. Pass DTOs to Client Component for interactivity
  return (
    <ThesisClient
      initialPortfolio="energy"
      energyTheses={energyTheses}
      copperTheses={copperTheses}
      energyPortfolioData={energyPortfolioData}
      copperPortfolioData={copperPortfolioData}
    />
  );
}
