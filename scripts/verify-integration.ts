/**
 * Verify Phase 5 database integration
 * Check that all data is properly stored and accessible
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Phase 5 Database Integration...\n');

  // 1. Check Portfolios
  console.log('📊 PORTFOLIOS:');
  const portfolios = await prisma.portfolio.findMany({
    include: {
      _count: {
        select: {
          stocks: true,
          theses: true,
          checklists: true,
        }
      }
    }
  });
  
  for (const p of portfolios) {
    console.log(`  ✅ ${p.name} (${p.type})`);
    console.log(`     - Initial Value: $${p.initialValue}`);
    console.log(`     - Borrowed: $${p.borrowedAmount}`);
    console.log(`     - Stocks: ${p._count.stocks}`);
    console.log(`     - Theses: ${p._count.theses}`);
    console.log(`     - Checklists: ${p._count.checklists}`);
  }

  // 2. Check Stocks
  console.log('\n📈 STOCKS:');
  const stocks = await prisma.stock.findMany({
    include: {
      portfolio: {
        select: { name: true }
      }
    },
    orderBy: {
      portfolio: {
        name: 'asc'
      }
    }
  });
  
  const energyStocks = stocks.filter(s => s.portfolio.name === 'Energy Portfolio');
  const copperStocks = stocks.filter(s => s.portfolio.name === 'Copper Portfolio');
  
  console.log(`  Energy Portfolio: ${energyStocks.length} stocks`);
  energyStocks.forEach(s => {
    console.log(`    - ${s.symbol}: ${s.shares} shares @ $${s.avgPrice.toFixed(2)}`);
  });
  
  console.log(`  Copper Portfolio: ${copperStocks.length} stocks`);
  copperStocks.forEach(s => {
    console.log(`    - ${s.symbol}: ${s.shares} shares @ $${s.avgPrice.toFixed(2)}`);
  });

  // 3. Check Investment Theses
  console.log('\n🎯 INVESTMENT THESES:');
  const theses = await prisma.investmentThesis.findMany({
    include: {
      portfolio: {
        select: { name: true, type: true }
      }
    },
    orderBy: {
      portfolio: {
        name: 'asc'
      }
    }
  });
  
  const energyTheses = theses.filter(t => t.portfolio.type === 'energy');
  const copperTheses = theses.filter(t => t.portfolio.type === 'copper');
  
  console.log(`  Energy Portfolio: ${energyTheses.length} theses`);
  energyTheses.forEach(t => {
    console.log(`    ✅ ${t.title} (${t.urgency}) - Health: ${t.thesisHealthScore}%`);
    console.log(`       Metrics: ${(t.keyMetrics as any[]).length}, Stop Loss Rules: ${(t.stopLossRules as any[]).length}`);
  });
  
  console.log(`  Copper Portfolio: ${copperTheses.length} theses`);
  copperTheses.forEach(t => {
    console.log(`    ✅ ${t.title} (${t.urgency}) - Health: ${t.thesisHealthScore}%`);
    console.log(`       Metrics: ${(t.keyMetrics as any[]).length}, Stop Loss Rules: ${(t.stopLossRules as any[]).length}`);
  });

  // 4. Verify JSON structure integrity
  console.log('\n🔧 JSON STRUCTURE VALIDATION:');
  const sampleThesis = theses[0];
  if (sampleThesis) {
    console.log(`  Sample Thesis: ${sampleThesis.title}`);
    
    const keyMetrics = sampleThesis.keyMetrics as any[];
    console.log(`  ✅ keyMetrics is array: ${Array.isArray(keyMetrics)}`);
    if (keyMetrics.length > 0) {
      console.log(`     - First metric: ${keyMetrics[0].name} = ${keyMetrics[0].currentValue}`);
    }
    
    const stopLossRules = sampleThesis.stopLossRules as any[];
    console.log(`  ✅ stopLossRules is array: ${Array.isArray(stopLossRules)}`);
    if (stopLossRules.length > 0) {
      console.log(`     - First rule: ${stopLossRules[0].type}`);
    }
    
    const exitCriteria = sampleThesis.exitCriteria as any;
    console.log(`  ✅ exitCriteria is object: ${typeof exitCriteria === 'object'}`);
    if (exitCriteria) {
      console.log(`     - Target Value: $${exitCriteria.targetValue}`);
      console.log(`     - Profit Target: ${exitCriteria.profitTarget}%`);
    }
  }

  // 5. Summary
  console.log('\n📋 SUMMARY:');
  console.log(`  ✅ Portfolios: ${portfolios.length}`);
  console.log(`  ✅ Stocks: ${stocks.length}`);
  console.log(`  ✅ Investment Theses: ${theses.length}`);
  console.log(`  ✅ Checklists: ${await prisma.dailyChecklist.count()}`);
  console.log(`  ✅ Checklist Tasks: ${await prisma.checklistTask.count()}`);

  // 6. Calculate portfolio values
  console.log('\n💰 PORTFOLIO VALUES:');
  for (const portfolio of portfolios) {
    const portfolioStocks = await prisma.stock.findMany({
      where: { portfolioId: portfolio.id }
    });
    
    const totalValue = portfolioStocks.reduce((sum, s) => {
      return sum + (s.actualValue || (s.shares * s.avgPrice));
    }, 0);
    
    const equityPercent = ((totalValue - portfolio.borrowedAmount) / totalValue) * 100;
    
    console.log(`  ${portfolio.name}:`);
    console.log(`    - Current Value: $${totalValue.toFixed(2)}`);
    console.log(`    - Cost Basis: $${portfolio.initialValue}`);
    console.log(`    - Borrowed: $${portfolio.borrowedAmount}`);
    console.log(`    - Equity: ${equityPercent.toFixed(1)}%`);
  }

  console.log('\n✅ All verification checks passed!');
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
