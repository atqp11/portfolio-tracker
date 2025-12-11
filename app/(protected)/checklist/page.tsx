import { requireUser } from '@lib/auth/session';
import { fetchChecklistForPortfolio, fetchPortfolioData } from './actions';
import ChecklistClient from './ChecklistClient';

/**
 * Checklist Page - Server Component
 *
 * Follows RSC pattern from 0_AI_Coding_Agent_Guide.md:
 * - Server Component for data fetching
 * - Auth via requireUser()
 * - Data fetched via server actions (which call services)
 * - Interactivity delegated to Client Component
 * - No business logic in page
 * - No direct service/repository imports
 */
export default async function ChecklistPage() {
  // 1. Auth check (RSC pattern - section 6)
  await requireUser();

  // 2. Fetch data via server actions (which call service layer with DTO handling)
  const [dbEnergyChecklist, dbCopperChecklist, energyPortfolio, copperPortfolio] = await Promise.all([
    fetchChecklistForPortfolio('energy'),
    fetchChecklistForPortfolio('copper'),
    fetchPortfolioData('energy'),
    fetchPortfolioData('copper'),
  ]);

  // 3. Generate fallback checklist if none exists for today (preserve old behavior)
  const generateDefaultChecklist = (portfolioType: 'energy' | 'copper', portfolio: any) => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const checklistId = `checklist_${portfolioType}_${dateStr}`;

    const currentValue = portfolio?.initialValue || (portfolioType === 'energy' ? 20000 : 10000);
    const marginUsed = portfolio?.borrowedAmount || (portfolioType === 'energy' ? 6000 : 3000);
    const equityPercent = currentValue > 0 ? ((currentValue - marginUsed) / currentValue) * 100 : 0;
    const stopLossValue = currentValue * 0.85; // 15% stop loss
    const marginCallValue = marginUsed / 0.30; // 30% margin requirement

    return {
      id: checklistId,
      portfolioId: portfolio?.id || portfolioType,
      date: dateStr,
      totalTasks: 7,
      completedTasks: 0,
      completionPercentage: 0,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      morningRoutine: [
        {
          id: `${checklistId}_morning_1`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: `Open dashboard, check ${portfolioType === 'energy' ? 'WTI/NG prices' : 'copper price'} and portfolio value`,
          category: 'morning_routine',
          frequency: 'daily',
          urgency: currentValue < stopLossValue ? 'red' : 'green',
          completed: false,
          completedAt: null,
          condition: `Value: $${currentValue.toFixed(0)}`,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
        {
          id: `${checklistId}_morning_2`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: 'Review overnight news affecting positions',
          category: 'morning_routine',
          frequency: 'daily',
          urgency: 'green',
          completed: false,
          completedAt: null,
          condition: null,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
      ],
      marketHours: [
        {
          id: `${checklistId}_market_1`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: `Verify no red alerts (stop-loss $${stopLossValue.toFixed(0)}, margin call $${marginCallValue.toFixed(0)})`,
          category: 'market_hours',
          frequency: 'daily',
          urgency: currentValue < marginCallValue ? 'red' : 'green',
          completed: false,
          completedAt: null,
          condition: `Equity: ${equityPercent.toFixed(1)}%`,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
        {
          id: `${checklistId}_market_2`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: 'Monitor major price movements (>3% intraday)',
          category: 'market_hours',
          frequency: 'daily',
          urgency: 'green',
          completed: false,
          completedAt: null,
          condition: null,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
      ],
      eveningReview: [
        {
          id: `${checklistId}_evening_1`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: 'Review day performance, note significant moves (>5%)',
          category: 'evening_review',
          frequency: 'daily',
          urgency: 'green',
          completed: false,
          completedAt: null,
          condition: null,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
        {
          id: `${checklistId}_evening_2`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: 'Update investment theses if needed',
          category: 'evening_review',
          frequency: 'daily',
          urgency: 'green',
          completed: false,
          completedAt: null,
          condition: null,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
        {
          id: `${checklistId}_evening_3`,
          checklistId,
          portfolioId: portfolio?.id || portfolioType,
          task: 'Plan for tomorrow (earnings, economic data)',
          category: 'evening_review',
          frequency: 'daily',
          urgency: 'green',
          completed: false,
          completedAt: null,
          condition: null,
          dueDate: dateStr,
          actions: [],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
      ],
      eventDriven: [],
    };
  };

  // Use database checklist or fallback to generated one
  const energyChecklist = dbEnergyChecklist || generateDefaultChecklist('energy', energyPortfolio);
  const copperChecklist = dbCopperChecklist || generateDefaultChecklist('copper', copperPortfolio);

  // 4. Pass DTOs to Client Component for interactivity
  return (
    <ChecklistClient
      initialPortfolio="energy"
      energyChecklist={energyChecklist}
      copperChecklist={copperChecklist}
    />
  );
}
