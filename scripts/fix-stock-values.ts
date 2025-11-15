/**
 * Update stock actualValue fields in database
 * Calculate actualValue = shares * avgPrice for all stocks
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating stock actualValue fields...\n');

  const stocks = await prisma.stock.findMany();

  for (const stock of stocks) {
    const actualValue = stock.shares * stock.avgPrice;
    
    await prisma.stock.update({
      where: { id: stock.id },
      data: { actualValue },
    });

    console.log(`✓ Updated ${stock.symbol}: ${stock.shares} shares × $${stock.avgPrice} = $${actualValue.toFixed(2)}`);
  }

  console.log(`\n✅ Updated ${stocks.length} stocks with actualValue`);
  
  // Verify totals
  const portfolios = await prisma.portfolio.findMany({
    include: { stocks: true },
  });

  console.log('\nPortfolio Values:');
  portfolios.forEach(p => {
    const total = p.stocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);
    const equity = total - p.borrowedAmount;
    const equityPercent = (equity / total) * 100;
    console.log(`  ${p.name}: $${total.toFixed(2)} (Equity: ${equityPercent.toFixed(1)}%)`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
