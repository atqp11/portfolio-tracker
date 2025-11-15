/**
 * Check Database Content - Utility to see what's stored in Supabase
 * Run with: npx tsx scripts/check-db.ts
 */

import { prisma } from '../lib/prisma';

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database...\n');

  try {
    // Check Portfolios
    const portfolios = await prisma.portfolio.findMany({
      include: {
        stocks: true,
        theses: true,
        checklists: {
          include: {
            tasks: true,
          },
          take: 1,
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    console.log(`📊 Portfolios: ${portfolios.length}`);
    portfolios.forEach(p => {
      console.log(`  - ${p.name} (${p.type})`);
      console.log(`    Initial: $${p.initialValue}, Target: $${p.targetValue}`);
      console.log(`    Borrowed: $${p.borrowedAmount}`);
      console.log(`    Stocks: ${p.stocks.length}`);
      console.log(`    Theses: ${p.theses.length}`);
      console.log(`    Checklists: ${p.checklists.length}`);
      
      if (p.stocks.length > 0) {
        console.log(`    Stock Details:`);
        p.stocks.forEach(s => {
          console.log(`      - ${s.symbol} (${s.name}): ${s.shares} shares @ $${s.avgPrice}`);
        });
      }
    });

    // Check total counts
    const stockCount = await prisma.stock.count();
    const thesisCount = await prisma.investmentThesis.count();
    const checklistCount = await prisma.dailyChecklist.count();
    const taskCount = await prisma.checklistTask.count();

    console.log(`\n📈 Total Database Counts:`);
    console.log(`  - Stocks: ${stockCount}`);
    console.log(`  - Theses: ${thesisCount}`);
    console.log(`  - Checklists: ${checklistCount}`);
    console.log(`  - Tasks: ${taskCount}`);

    if (portfolios.length === 0) {
      console.log(`\n⚠️  Database is empty! No portfolios found.`);
      console.log(`💡 You may want to migrate data from localStorage/config.`);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
