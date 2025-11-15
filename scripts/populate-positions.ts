/**
 * Populate Database with Positions - Calculate and insert stock positions from mock data
 * Run with: npx tsx scripts/populate-positions.ts
 */

import { prisma } from '../lib/prisma';
import { MOCK_PRICES, PORTFOLIO_INITIAL_VALUES } from '../lib/mockData';

async function populatePositions() {
  console.log('📊 Populating Database with Stock Positions...\n');

  try {
    // Get portfolios
    const energyPortfolio = await prisma.portfolio.findFirst({
      where: { type: 'energy' },
      include: { stocks: true },
    });

    const copperPortfolio = await prisma.portfolio.findFirst({
      where: { type: 'copper' },
      include: { stocks: true },
    });

    if (!energyPortfolio || !copperPortfolio) {
      console.error('❌ Portfolios not found! Run seed-db.ts first.');
      return;
    }

    // Energy Portfolio - Calculate positions
    console.log('⚡ Energy Portfolio:');
    const energyAllocations = PORTFOLIO_INITIAL_VALUES.energy.allocations;
    const energyMargin = PORTFOLIO_INITIAL_VALUES.energy.margin;
    const energyCash = PORTFOLIO_INITIAL_VALUES.energy.cash;
    
    // Total allocation includes cash + margin
    const energyTotalAllocation = energyCash + energyMargin; // $20,000

    for (const stock of energyPortfolio.stocks) {
      const symbol = stock.symbol as keyof typeof MOCK_PRICES;
      const price = MOCK_PRICES[symbol];
      const cashAllocation = energyAllocations[symbol as keyof typeof energyAllocations];
      
      if (!cashAllocation) continue;
      
      // Calculate total allocation including proportional margin
      // Each position uses margin in same proportion as cash
      const proportionOfCash = cashAllocation / energyCash;
      const marginForThisStock = energyMargin * proportionOfCash;
      const totalAllocation = cashAllocation + marginForThisStock;
      
      // Calculate shares
      const shares = Math.floor(totalAllocation / price);
      const actualValue = shares * price;

      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          shares,
          avgPrice: price,
          currentPrice: price,
          actualValue,
        },
      });

      console.log(`  ${symbol}: ${shares} shares @ $${price.toFixed(2)} = $${actualValue.toFixed(2)}`);
      console.log(`    (Cash: $${cashAllocation}, Margin: $${marginForThisStock.toFixed(2)}, Total: $${totalAllocation.toFixed(2)})`);
    }

    // Calculate total energy portfolio value
    const energyStocks = await prisma.stock.findMany({
      where: { portfolioId: energyPortfolio.id },
    });
    const energyTotalValue = energyStocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);
    console.log(`  Total Portfolio Value: $${energyTotalValue.toFixed(2)}\n`);

    // Copper Portfolio - Calculate positions
    console.log('🔶 Copper Portfolio:');
    const copperAllocations = PORTFOLIO_INITIAL_VALUES.copper.allocations;
    const copperMargin = PORTFOLIO_INITIAL_VALUES.copper.margin;
    const copperCash = PORTFOLIO_INITIAL_VALUES.copper.cash;
    
    const copperTotalAllocation = copperCash + copperMargin; // $10,000

    for (const stock of copperPortfolio.stocks) {
      const symbol = stock.symbol as keyof typeof MOCK_PRICES;
      const price = MOCK_PRICES[symbol];
      const cashAllocation = copperAllocations[symbol as keyof typeof copperAllocations];
      
      if (!cashAllocation) continue;
      
      // Calculate total allocation including proportional margin
      const proportionOfCash = cashAllocation / copperCash;
      const marginForThisStock = copperMargin * proportionOfCash;
      const totalAllocation = cashAllocation + marginForThisStock;
      
      // Calculate shares
      const shares = Math.floor(totalAllocation / price);
      const actualValue = shares * price;

      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          shares,
          avgPrice: price,
          currentPrice: price,
          actualValue,
        },
      });

      console.log(`  ${symbol}: ${shares} shares @ $${price.toFixed(2)} = $${actualValue.toFixed(2)}`);
      console.log(`    (Cash: $${cashAllocation}, Margin: $${marginForThisStock.toFixed(2)}, Total: $${totalAllocation.toFixed(2)})`);
    }

    // Calculate total copper portfolio value
    const copperStocks = await prisma.stock.findMany({
      where: { portfolioId: copperPortfolio.id },
    });
    const copperTotalValue = copperStocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);
    console.log(`  Total Portfolio Value: $${copperTotalValue.toFixed(2)}\n`);

    console.log('✅ Stock positions populated successfully!');
    console.log('\n💡 Run check-db.ts to verify the data.');

  } catch (error) {
    console.error('❌ Error populating positions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populatePositions();
