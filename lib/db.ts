/**
 * Database utility functions for portfolio operations
 * Provides helper methods for common database queries
 */

import { prisma } from './prisma';
import { configs } from './config';

/**
 * Get or create a portfolio by ID (energy or copper)
 * Creates portfolio from config if it doesn't exist
 */
export async function getOrCreatePortfolio(portfolioType: 'energy' | 'copper') {
  const config = configs.find(c => c.id === portfolioType);
  if (!config) {
    throw new Error(`Config not found for ${portfolioType}`);
  }

  let portfolio = await prisma.portfolio.findFirst({
    where: {
      type: portfolioType,
    },
    include: {
      stocks: true,
      theses: true,
      checklists: {
        include: {
          tasks: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!portfolio) {
    // Create portfolio from config
    const targetValue = portfolioType === 'energy' ? 30000 : 15000;
    const borrowedAmount = config.initialMargin || 0;
    
    portfolio = await prisma.portfolio.create({
      data: {
        name: config.name,
        type: portfolioType,
        initialValue: config.initialValue,
        targetValue,
        borrowedAmount,
        marginCallLevel: 0.30,
      },
      include: {
        stocks: true,
        theses: true,
        checklists: {
          include: {
            tasks: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  return portfolio;
}

/**
 * Calculate current portfolio value from stocks
 */
export function calculatePortfolioValue(stocks: any[]) {
  return stocks.reduce((sum, stock) => sum + (stock.actualValue || 0), 0);
}

/**
 * Get or create today's checklist for a portfolio
 */
export async function getOrCreateTodayChecklist(portfolioId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checklist = await prisma.dailyChecklist.findFirst({
    where: {
      portfolioId,
      date: today,
    },
    include: {
      tasks: {
        orderBy: [
          { urgency: 'desc' },
          { completed: 'asc' },
        ],
      },
    },
  });

  if (!checklist) {
    checklist = await prisma.dailyChecklist.create({
      data: {
        portfolioId,
        date: today,
        totalTasks: 0,
        completedTasks: 0,
        completionPercentage: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      include: {
        tasks: {
          orderBy: [
            { urgency: 'desc' },
            { completed: 'asc' },
          ],
        },
      },
    });
  }

  return checklist;
}

/**
 * Update checklist completion stats
 */
export async function updateChecklistStats(checklistId: string) {
  const tasks = await prisma.checklistTask.findMany({
    where: { checklistId },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  await prisma.dailyChecklist.update({
    where: { id: checklistId },
    data: {
      totalTasks,
      completedTasks,
      completionPercentage,
    },
  });

  return { totalTasks, completedTasks, completionPercentage };
}

/**
 * Sync localStorage portfolio data to database
 * Useful for migration from old localStorage-based system
 */
export async function syncPortfolioFromLocalStorage(
  portfolioType: 'energy' | 'copper',
  cachedData: any[]
) {
  const portfolio = await getOrCreatePortfolio(portfolioType);

  // Delete existing stocks
  await prisma.stock.deleteMany({
    where: { portfolioId: portfolio.id },
  });

  // Create stocks from cached data
  const stocks = await Promise.all(
    cachedData.map(stock =>
      prisma.stock.create({
        data: {
          portfolioId: portfolio.id,
          symbol: stock.ticker || stock.symbol,
          name: stock.name || stock.ticker,
          shares: stock.shares || 0,
          avgPrice: stock.avgPrice || 0,
          currentPrice: stock.currentPrice || 0,
          actualValue: stock.actualValue || 0,
        },
      })
    )
  );

  return { portfolio, stocks };
}
