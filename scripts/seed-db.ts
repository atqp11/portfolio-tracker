/**
 * Seed Database - Initialize portfolios from config
 * Run with: npx tsx scripts/seed-db.ts
 */

import { prisma } from '../lib/prisma';
import { configs } from '../lib/config';

async function seedDatabase() {
  console.log('🌱 Seeding Database from Config...\n');

  try {
    // Create Energy Portfolio
    const energyConfig = configs.find(c => c.id === 'energy')!;
    const energyPortfolio = await prisma.portfolio.create({
      data: {
        name: energyConfig.name,
        type: 'energy',
        initialValue: energyConfig.initialValue,
        targetValue: 30000, // From your previous thesis calculations
        borrowedAmount: energyConfig.initialMargin,
        marginCallLevel: 0.30,
      },
    });
    console.log(`✅ Created ${energyPortfolio.name}`);

    // Create Copper Portfolio
    const copperConfig = configs.find(c => c.id === 'copper')!;
    const copperPortfolio = await prisma.portfolio.create({
      data: {
        name: copperConfig.name,
        type: 'copper',
        initialValue: copperConfig.initialValue,
        targetValue: 15000, // From your previous thesis calculations
        borrowedAmount: copperConfig.initialMargin,
        marginCallLevel: 0.30,
      },
    });
    console.log(`✅ Created ${copperPortfolio.name}`);

    // Create initial stocks from config (with 0 shares - user will add actual positions)
    console.log('\n📊 Creating stock templates from config...');
    
    for (const stockConfig of energyConfig.stocks) {
      await prisma.stock.create({
        data: {
          portfolioId: energyPortfolio.id,
          symbol: stockConfig.symbol,
          name: stockConfig.name,
          shares: 0, // Start with 0, user will update with actual positions
          avgPrice: 0,
          currentPrice: 0,
          actualValue: 0,
        },
      });
      console.log(`  - Added ${stockConfig.symbol} template to Energy Portfolio`);
    }

    for (const stockConfig of copperConfig.stocks) {
      await prisma.stock.create({
        data: {
          portfolioId: copperPortfolio.id,
          symbol: stockConfig.symbol,
          name: stockConfig.name,
          shares: 0, // Start with 0, user will update with actual positions
          avgPrice: 0,
          currentPrice: 0,
          actualValue: 0,
        },
      });
      console.log(`  - Added ${stockConfig.symbol} template to Copper Portfolio`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Note: Stock shares set to 0. Use the app to:');
    console.log('  1. Update stock positions with actual shares/prices');
    console.log('  2. Create investment theses');
    console.log('  3. Set up daily checklists');
    console.log('\n💡 If you have localStorage data, it will be migrated on first load.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
