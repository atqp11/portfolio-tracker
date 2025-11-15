/**
 * End-to-End Testing for Phase 5 Database Integration
 * Tests CRUD operations and verifies all features work correctly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const passed = `${colors.green}✓${colors.reset}`;
const failed = `${colors.red}✗${colors.reset}`;
const info = `${colors.blue}ℹ${colors.reset}`;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ${passed} ${message}`);
    testsPassed++;
  } else {
    console.log(`  ${failed} ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testSection(title: string, testFn: () => Promise<void>) {
  console.log(`\n${colors.cyan}${colors.bright}${title}${colors.reset}`);
  try {
    await testFn();
  } catch (error) {
    console.log(`  ${failed} Section failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  End-to-End Testing - Phase 5 Database Integration${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  // Test 1: READ - Portfolio Data
  await testSection('📊 TEST 1: READ Operations - Portfolios', async () => {
    const portfolios = await prisma.portfolio.findMany({
      include: {
        _count: {
          select: { stocks: true, theses: true, checklists: true }
        }
      }
    });

    assert(portfolios.length === 2, 'Should have 2 portfolios');
    
    const energyPortfolio = portfolios.find(p => p.type === 'energy');
    const copperPortfolio = portfolios.find(p => p.type === 'copper');
    
    assert(!!energyPortfolio, 'Energy portfolio exists');
    assert(!!copperPortfolio, 'Copper portfolio exists');
    assert(energyPortfolio!.borrowedAmount === 6000, 'Energy portfolio borrowed amount is $6,000');
    assert(copperPortfolio!.borrowedAmount === 3000, 'Copper portfolio borrowed amount is $3,000');
    assert(energyPortfolio!._count.stocks === 5, 'Energy portfolio has 5 stocks');
    assert(copperPortfolio!._count.stocks === 4, 'Copper portfolio has 4 stocks');
  });

  // Test 2: READ - Stock Data
  await testSection('📈 TEST 2: READ Operations - Stocks', async () => {
    const stocks = await prisma.stock.findMany({
      orderBy: { symbol: 'asc' }
    });

    assert(stocks.length === 9, 'Should have 9 stocks total');
    
    const cnq = stocks.find(s => s.symbol === 'CNQ');
    assert(!!cnq, 'CNQ stock exists');
    assert(cnq!.shares === 59, 'CNQ has 59 shares');
    assert(cnq!.avgPrice === 84.50, 'CNQ avgPrice is $84.50');
    
    const fcx = stocks.find(s => s.symbol === 'FCX');
    assert(!!fcx, 'FCX stock exists');
    assert(fcx!.shares === 99, 'FCX has 99 shares');
    assert(fcx!.avgPrice === 40.10, 'FCX avgPrice is $40.10');
    
    // Verify all stocks have required fields
    stocks.forEach(stock => {
      assert(stock.shares > 0, `${stock.symbol} has shares > 0`);
      assert(stock.avgPrice > 0, `${stock.symbol} has avgPrice > 0`);
    });
  });

  // Test 3: READ - Investment Theses
  await testSection('🎯 TEST 3: READ Operations - Investment Theses', async () => {
    const theses = await prisma.investmentThesis.findMany();

    assert(theses.length === 8, 'Should have 8 theses total (4 per portfolio)');
    
    const marginThesis = theses.find(t => t.title === 'Margin Decision');
    assert(!!marginThesis, 'Margin Decision thesis exists');
    assert(marginThesis!.ticker === 'ENERGY_PORTFOLIO' || marginThesis!.ticker === 'COPPER_PORTFOLIO', 'Thesis has valid ticker');
    
    // Verify JSON fields structure
    const keyMetrics = marginThesis!.keyMetrics as any[];
    assert(Array.isArray(keyMetrics), 'keyMetrics is an array');
    if (keyMetrics.length > 0) {
      assert('name' in keyMetrics[0], 'keyMetrics has name field');
      assert('currentValue' in keyMetrics[0], 'keyMetrics has currentValue field');
      assert('urgency' in keyMetrics[0], 'keyMetrics has urgency field');
    }
    
    const stopLossRules = marginThesis!.stopLossRules as any[];
    assert(Array.isArray(stopLossRules), 'stopLossRules is an array');
    
    const exitCriteria = marginThesis!.exitCriteria as any;
    assert(typeof exitCriteria === 'object', 'exitCriteria is an object');
    assert('targetValue' in exitCriteria, 'exitCriteria has targetValue');
    
    // Verify urgency and health scores
    theses.forEach(thesis => {
      assert(['green', 'yellow', 'red'].includes(thesis.urgency), `${thesis.title} has valid urgency`);
      assert(thesis.thesisHealthScore >= 0 && thesis.thesisHealthScore <= 100, `${thesis.title} has valid health score`);
    });
  });

  // Test 4: CREATE - New Stock
  await testSection('➕ TEST 4: CREATE Operation - Add Test Stock', async () => {
    const energyPortfolio = await prisma.portfolio.findFirst({
      where: { type: 'energy' }
    });

    const testStock = await prisma.stock.create({
      data: {
        portfolioId: energyPortfolio!.id,
        symbol: 'TEST',
        name: 'Test Stock',
        shares: 100,
        avgPrice: 50.00,
        currentPrice: 50.00,
        actualValue: 5000,
      }
    });

    assert(testStock.symbol === 'TEST', 'Test stock created with correct symbol');
    assert(testStock.shares === 100, 'Test stock has 100 shares');
    
    const verifyStock = await prisma.stock.findUnique({
      where: { id: testStock.id }
    });
    assert(!!verifyStock, 'Test stock can be retrieved after creation');
  });

  // Test 5: UPDATE - Modify Stock
  await testSection('✏️ TEST 5: UPDATE Operation - Modify Stock', async () => {
    const testStock = await prisma.stock.findFirst({
      where: { symbol: 'TEST' }
    });

    const updated = await prisma.stock.update({
      where: { id: testStock!.id },
      data: {
        shares: 150,
        currentPrice: 55.00,
        actualValue: 8250,
      }
    });

    assert(updated.shares === 150, 'Stock shares updated to 150');
    assert(updated.currentPrice === 55.00, 'Stock currentPrice updated to $55.00');
    assert(updated.actualValue === 8250, 'Stock actualValue updated to $8,250');
  });

  // Test 6: DELETE - Remove Test Stock
  await testSection('🗑️ TEST 6: DELETE Operation - Remove Test Stock', async () => {
    const testStock = await prisma.stock.findFirst({
      where: { symbol: 'TEST' }
    });

    await prisma.stock.delete({
      where: { id: testStock!.id }
    });

    const verifyDeleted = await prisma.stock.findFirst({
      where: { symbol: 'TEST' }
    });
    assert(!verifyDeleted, 'Test stock successfully deleted');
    
    const remainingStocks = await prisma.stock.count();
    assert(remainingStocks === 9, 'Stock count back to original 9');
  });

  // Test 7: Relationships - Cascade Delete
  await testSection('🔗 TEST 7: Relationship Integrity - Cascade Delete', async () => {
    // Create test portfolio with stock
    const testPortfolio = await prisma.portfolio.create({
      data: {
        name: 'Test Portfolio',
        type: 'test',
        initialValue: 10000,
        targetValue: 15000,
        borrowedAmount: 0,
        marginCallLevel: 0.30,
      }
    });

    const testStock = await prisma.stock.create({
      data: {
        portfolioId: testPortfolio.id,
        symbol: 'TESTREL',
        name: 'Test Relationship',
        shares: 50,
        avgPrice: 100,
      }
    });

    assert(!!testStock, 'Test relationship stock created');
    
    // Delete portfolio (should cascade to stock)
    await prisma.portfolio.delete({
      where: { id: testPortfolio.id }
    });

    const stockShouldBeDeleted = await prisma.stock.findUnique({
      where: { id: testStock.id }
    });
    assert(!stockShouldBeDeleted, 'Stock automatically deleted when portfolio deleted (cascade)');
  });

  // Test 8: Complex Query - Portfolio with Stats
  await testSection('🔍 TEST 8: Complex Queries - Aggregations', async () => {
    const energyPortfolio = await prisma.portfolio.findFirst({
      where: { type: 'energy' },
      include: {
        stocks: true,
        theses: true,
      }
    });

    const totalStockValue = energyPortfolio!.stocks.reduce((sum, stock) => {
      return sum + (stock.actualValue || (stock.shares * stock.avgPrice));
    }, 0);

    assert(totalStockValue > 0, 'Can calculate total portfolio value from stocks');
    assert(energyPortfolio!.theses.length === 4, 'Portfolio has correct number of theses');
    
    const equityPercent = ((totalStockValue - energyPortfolio!.borrowedAmount) / totalStockValue) * 100;
    assert(equityPercent > 30, 'Portfolio equity is above margin call threshold (30%)');
    assert(equityPercent < 100, 'Portfolio equity is valid percentage');
    
    console.log(`  ${info} Portfolio Value: $${totalStockValue.toFixed(2)}, Equity: ${equityPercent.toFixed(1)}%`);
  });

  // Test 9: Data Integrity - No Orphaned Records
  await testSection('🔒 TEST 9: Data Integrity Checks', async () => {
    const stocks = await prisma.stock.findMany();
    const portfolioIds = new Set((await prisma.portfolio.findMany()).map(p => p.id));
    
    stocks.forEach(stock => {
      assert(portfolioIds.has(stock.portfolioId), `Stock ${stock.symbol} has valid portfolio reference`);
    });

    const theses = await prisma.investmentThesis.findMany();
    theses.forEach(thesis => {
      assert(portfolioIds.has(thesis.portfolioId), `Thesis "${thesis.title}" has valid portfolio reference`);
    });
  });

  // Test 10: Performance - Query Response Time
  await testSection('⚡ TEST 10: Performance Checks', async () => {
    const startTime = Date.now();
    
    await Promise.all([
      prisma.portfolio.findMany({ include: { stocks: true } }),
      prisma.investmentThesis.findMany(),
      prisma.stock.findMany(),
    ]);
    
    const duration = Date.now() - startTime;
    assert(duration < 2000, `All queries completed in under 2 seconds (${duration}ms)`);
    console.log(`  ${info} Query time: ${duration}ms`);
  });

  // Summary
  console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  Test Results Summary${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${testsFailed}${colors.reset}`);
  console.log(`  Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ ALL TESTS PASSED!${colors.reset}`);
    console.log(`\n${info} Phase 5 database integration is fully functional.`);
    console.log(`${info} Ready for production deployment or Phase 6 (AI integration).\n`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ SOME TESTS FAILED${colors.reset}`);
    console.log(`\n${colors.yellow}Please review failed tests and fix issues before proceeding.${colors.reset}\n`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(`\n${colors.red}${colors.bright}Fatal Error:${colors.reset}`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
