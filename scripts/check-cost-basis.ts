import { prisma } from '@lib/prisma';

async function checkCostBasis() {
  const stocks = await prisma.stock.findMany({
    orderBy: [
      { portfolioId: 'asc' },
      { symbol: 'asc' }
    ]
  });
  
  console.log('📊 Stock Cost Basis & Current Prices:\n');
  
  stocks.forEach(s => {
    const costBasis = s.shares * s.avgPrice.toNumber();
    const currentValue = s.actualValue?.toNumber() || 0;
    const unrealizedPL = currentValue - costBasis;
    const plPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
    
    console.log(`${s.symbol}:`);
    console.log(`  Shares: ${s.shares}`);
    console.log(`  Avg Price (Cost Basis): $${s.avgPrice.toFixed(2)}`);
    console.log(`  Current Price: $${s.currentPrice?.toFixed(2) || 'N/A'}`);
    console.log(`  Total Cost: $${costBasis.toFixed(2)}`);
    console.log(`  Current Value: $${currentValue.toFixed(2)}`);
    console.log(`  Unrealized P&L: $${unrealizedPL.toFixed(2)} (${plPercent.toFixed(2)}%)\n`);
  });
  
  await prisma.$disconnect();
}

checkCostBasis();
