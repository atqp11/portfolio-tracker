/**
 * Populate investment theses in database
 * Phase 5: Migrate thesis data from config to database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Populating investment theses...\n');

  // Get portfolios
  const energyPortfolio = await prisma.portfolio.findFirst({
    where: { type: 'energy' }
  });

  const copperPortfolio = await prisma.portfolio.findFirst({
    where: { type: 'copper' }
  });

  if (!energyPortfolio || !copperPortfolio) {
    throw new Error('Portfolios not found. Run seed-db.ts first.');
  }

  // Get stocks to calculate current values
  const energyStocks = await prisma.stock.findMany({
    where: { portfolioId: energyPortfolio.id }
  });

  const copperStocks = await prisma.stock.findMany({
    where: { portfolioId: copperPortfolio.id }
  });

  const energyCurrentValue = energyStocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);
  const copperCurrentValue = copperStocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);

  console.log(`Energy Portfolio Current Value: $${energyCurrentValue.toFixed(2)}`);
  console.log(`Copper Portfolio Current Value: $${copperCurrentValue.toFixed(2)}\n`);

  // Energy portfolio theses
  const energyMarginUsed = energyPortfolio.borrowedAmount;
  const energyMarginCallValue = energyMarginUsed / energyPortfolio.marginCallLevel;
  const energyEquityPercent = energyCurrentValue > 0 ? ((energyCurrentValue - energyMarginUsed) / energyCurrentValue) * 100 : 0;
  const energyTargetDeleverValue = 30000;
  const energyTargetProfitValue = 30000;

  const energyTheses = [
    {
      portfolioId: energyPortfolio.id,
      ticker: 'ENERGY_PORTFOLIO',
      title: 'Margin Decision',
      description: '30% margin ($6,000 borrowed vs $14,000 cash). Proportional across CNQ, SU, TRMLF, AETUF, TRP. Each $1 cash controls $1.43 in positions.',
      rationale: `Leverages 2025 LNG export boom (+15% YoY) and stable WTI (~$70/bbl). All positions have Debt/EBITDA < 1.0x. Margin call triggers at $${energyMarginCallValue.toFixed(0)} (equity < 30%).`,
      bearCase: 'Oil crash below $60/bbl, recession reducing energy demand, margin call if equity drops below 30%.',
      risks: ['Oil price volatility', 'Margin call risk', 'Interest rate increases'],
      keyMetrics: [
        {
          name: 'Equity Percentage',
          targetValue: '>45%',
          currentValue: `${energyEquityPercent.toFixed(1)}%`,
          condition: 'Must stay above 45%, margin call at 30%',
          urgency: energyEquityPercent < 30 ? 'red' : energyEquityPercent < 40 ? 'yellow' : 'green',
        },
        {
          name: 'Current Portfolio Value',
          targetValue: `>$${energyMarginCallValue.toFixed(0)}`,
          currentValue: `$${energyCurrentValue.toFixed(0)}`,
          condition: `Margin call triggers at $${energyMarginCallValue.toFixed(0)}`,
          urgency: energyCurrentValue < energyMarginCallValue ? 'red' : energyCurrentValue < 16000 ? 'yellow' : 'green',
        },
      ],
      stopLossRules: [
        {
          type: 'margin_call',
          trigger: `Portfolio value drops below $${energyMarginCallValue.toFixed(0)} (equity < 30%)`,
          action: 'Immediately sell positions to meet margin requirements',
          currentDistance: energyCurrentValue > energyMarginCallValue ? `$${(energyCurrentValue - energyMarginCallValue).toFixed(0)} away` : 'TRIGGERED',
        },
      ],
      exitCriteria: {
        targetValue: energyTargetDeleverValue,
        profitTarget: 150,
        conditions: ['Portfolio reaches $30k', 'WTI falls below $60/bbl', 'NG falls below $2.50'],
      },
      thesisHealthScore: energyEquityPercent < 30 ? 25 : energyEquityPercent < 40 ? 60 : 90,
      urgency: energyEquityPercent < 30 ? 'red' : energyEquityPercent < 40 ? 'yellow' : 'green',
      lastValidated: new Date(),
    },
    {
      portfolioId: energyPortfolio.id,
      ticker: 'ENERGY_PORTFOLIO',
      title: 'Delever Decision',
      description: `Trigger at $30,000 (+50%). Sell $6,000 pro-rata to repay margin, highest beta first (TRMLF → AETUF). Early delever if NG < $2.50 or WTI < $60.`,
      rationale: 'Lock in gains and eliminate leverage risk. High-beta stocks (TRMLF, AETUF) are more volatile and suitable for profit-taking first.',
      bearCase: null,
      risks: [],
      keyMetrics: [
        {
          name: 'Distance to Target',
          targetValue: `$${energyTargetDeleverValue.toFixed(0)}`,
          currentValue: `$${energyCurrentValue.toFixed(0)}`,
          condition: `${((energyCurrentValue / energyTargetDeleverValue) * 100).toFixed(1)}% of target`,
          urgency: energyCurrentValue >= energyTargetDeleverValue * 0.9 ? 'red' : energyCurrentValue >= energyTargetDeleverValue * 0.75 ? 'yellow' : 'green',
        },
      ],
      stopLossRules: [
        {
          type: 'thesis_invalidation',
          trigger: `Portfolio value reaches $${energyTargetDeleverValue.toFixed(0)}`,
          action: 'Execute delever - sell $6,000 pro-rata to repay margin',
        },
      ],
      exitCriteria: {
        targetValue: energyTargetDeleverValue,
        profitTarget: 150,
        conditions: ['Value reaches $30k', 'Lock in 50% gain', 'Eliminate leverage risk'],
      },
      thesisHealthScore: energyCurrentValue >= energyTargetDeleverValue * 0.9 ? 30 : energyCurrentValue >= energyTargetDeleverValue * 0.75 ? 60 : 90,
      urgency: energyCurrentValue >= energyTargetDeleverValue * 0.9 ? 'red' : energyCurrentValue >= energyTargetDeleverValue * 0.75 ? 'yellow' : 'green',
      lastValidated: new Date(),
    },
    {
      portfolioId: energyPortfolio.id,
      ticker: 'ENERGY_PORTFOLIO',
      title: 'Profit Taking Decision',
      description: 'At $30,000, trim 50% of top performer, reallocate 50% to cash, 50% to TRP (stable 5.5% dividend). Hold remaining positions.',
      rationale: 'TRP offers defensive positioning with regulated pipeline income and lower volatility, balancing portfolio risk while maintaining energy exposure.',
      bearCase: null,
      risks: [],
      keyMetrics: [
        {
          name: 'Distance to Profit Target',
          targetValue: `$${energyTargetProfitValue.toFixed(0)}`,
          currentValue: `$${energyCurrentValue.toFixed(0)}`,
          condition: `${((energyCurrentValue / energyTargetProfitValue) * 100).toFixed(1)}% of target`,
          urgency: energyCurrentValue >= energyTargetProfitValue * 0.9 ? 'yellow' : 'green',
        },
      ],
      stopLossRules: [],
      exitCriteria: {
        targetValue: energyTargetProfitValue,
        profitTarget: 150,
        conditions: ['Trim 50% of top performer', 'Reallocate to TRP and cash'],
      },
      thesisHealthScore: energyCurrentValue >= energyTargetProfitValue * 0.9 ? 60 : 90,
      urgency: energyCurrentValue >= energyTargetProfitValue * 0.9 ? 'yellow' : 'green',
      lastValidated: new Date(),
    },
    {
      portfolioId: energyPortfolio.id,
      ticker: 'ENERGY_PORTFOLIO',
      title: 'DRIP Decision',
      description: '100% DRIP, quarterly, commission-free. Cap $40K/issuer/year. Typical yields: CNQ/SU 4-5%, TRP 5.5%, TRMLF/AETUF 2-3%.',
      rationale: 'Maximizes compounding. Canadian energy stocks provide strong dividend growth. Cost basis auto-tracked. Tax-efficient in TFSA/RRSP.',
      bearCase: null,
      risks: [],
      keyMetrics: [],
      stopLossRules: [],
      exitCriteria: {
        targetValue: 40000,
        profitTarget: 200,
        conditions: ['Maintain DRIP until portfolio matures'],
      },
      thesisHealthScore: 95,
      urgency: 'green',
      lastValidated: new Date(),
    },
  ];

  // Copper portfolio theses
  const copperMarginUsed = copperPortfolio.borrowedAmount;
  const copperMarginCallValue = copperMarginUsed / copperPortfolio.marginCallLevel;
  const copperEquityPercent = copperCurrentValue > 0 ? ((copperCurrentValue - copperMarginUsed) / copperCurrentValue) * 100 : 0;
  const copperTargetDeleverValue = 15000;
  const copperTargetProfitValue = 15000;

  const copperTheses = [
    {
      portfolioId: copperPortfolio.id,
      ticker: 'COPPER_PORTFOLIO',
      title: 'Margin Decision',
      description: '30% margin ($3,000 borrowed vs $7,000 cash). Proportional: FCX 40%, COPX 30%, ERO 15%, HBM 15%. Each $1 cash controls $1.43 positions.',
      rationale: '2025 EV/solar demand surge (+33% YoY). FCX/COPX have low cash costs ($1.50/lb breakeven), safe at current $4+ copper price.',
      bearCase: null,
      risks: [],
      keyMetrics: [
        {
          name: 'Equity Percentage',
          targetValue: '>45%',
          currentValue: `${copperEquityPercent.toFixed(1)}%`,
          condition: 'Monitor if copper falls below $3.80/lb',
          urgency: copperEquityPercent < 30 ? 'red' : copperEquityPercent < 40 ? 'yellow' : 'green',
        },
      ],
      stopLossRules: [
        {
          type: 'margin_call',
          trigger: `Portfolio value drops below $${copperMarginCallValue.toFixed(0)}`,
          action: 'Sell positions to meet margin requirements',
        },
      ],
      exitCriteria: {
        targetValue: copperTargetDeleverValue,
        profitTarget: 150,
        conditions: ['Portfolio reaches $15k', 'Copper falls below $3.80/lb'],
      },
      thesisHealthScore: copperEquityPercent < 30 ? 25 : copperEquityPercent < 40 ? 60 : 90,
      urgency: copperEquityPercent < 30 ? 'red' : copperEquityPercent < 40 ? 'yellow' : 'green',
      lastValidated: new Date(),
    },
    {
      portfolioId: copperPortfolio.id,
      ticker: 'COPPER_PORTFOLIO',
      title: 'Delever Decision',
      description: `Trigger at $15,000 (+50%). Sell $3,000 to repay margin, highest beta first (ERO → HBM). Early delever if copper < $3.80/lb.`,
      rationale: 'Junior miners (ERO, HBM) have 2-3x leverage to copper price. Trimming reduces downside risk while maintaining core FCX/COPX exposure.',
      bearCase: null,
      risks: [],
      keyMetrics: [
        {
          name: 'Distance to Target',
          targetValue: `$${copperTargetDeleverValue.toFixed(0)}`,
          currentValue: `$${copperCurrentValue.toFixed(0)}`,
          condition: `${((copperCurrentValue / copperTargetDeleverValue) * 100).toFixed(1)}% of target`,
          urgency: copperCurrentValue >= copperTargetDeleverValue * 0.9 ? 'red' : copperCurrentValue >= copperTargetDeleverValue * 0.75 ? 'yellow' : 'green',
        },
      ],
      stopLossRules: [
        {
          type: 'thesis_invalidation',
          trigger: `Portfolio reaches $${copperTargetDeleverValue.toFixed(0)}`,
          action: 'Sell $3,000 pro-rata to repay margin',
        },
      ],
      exitCriteria: {
        targetValue: copperTargetDeleverValue,
        profitTarget: 150,
        conditions: ['Value reaches $15k'],
      },
      thesisHealthScore: copperCurrentValue >= copperTargetDeleverValue * 0.9 ? 30 : copperCurrentValue >= copperTargetDeleverValue * 0.75 ? 60 : 90,
      urgency: copperCurrentValue >= copperTargetDeleverValue * 0.9 ? 'red' : copperCurrentValue >= copperTargetDeleverValue * 0.75 ? 'yellow' : 'green',
      lastValidated: new Date(),
    },
    {
      portfolioId: copperPortfolio.id,
      ticker: 'COPPER_PORTFOLIO',
      title: 'Profit Taking Decision',
      description: 'Trim 50% of top performer, reallocate 70% to COPX (diversified ETF), 30% cash.',
      rationale: 'COPX provides exposure to 30+ copper producers, reducing single-stock risk while capturing sector upside.',
      bearCase: null,
      risks: [],
      keyMetrics: [],
      stopLossRules: [],
      exitCriteria: {
        targetValue: copperTargetProfitValue,
        profitTarget: 150,
        conditions: ['Trim top performer', 'Reallocate to COPX'],
      },
      thesisHealthScore: copperCurrentValue >= copperTargetProfitValue * 0.9 ? 60 : 90,
      urgency: copperCurrentValue >= copperTargetProfitValue * 0.9 ? 'yellow' : 'green',
      lastValidated: new Date(),
    },
    {
      portfolioId: copperPortfolio.id,
      ticker: 'COPPER_PORTFOLIO',
      title: 'DRIP Decision',
      description: '100% DRIP, cap $20K/issuer/year. FCX yields ~2%, miners 0-1%.',
      rationale: 'Limited dividend income, but DRIP ensures reinvestment discipline. Focus on capital appreciation from copper price growth.',
      bearCase: null,
      risks: [],
      keyMetrics: [],
      stopLossRules: [],
      exitCriteria: {
        targetValue: 20000,
        profitTarget: 200,
        conditions: ['Maintain DRIP for compounding'],
      },
      thesisHealthScore: 95,
      urgency: 'green',
      lastValidated: new Date(),
    },
  ];

  // Clear existing theses
  await prisma.investmentThesis.deleteMany({});
  console.log('Cleared existing theses\n');

  // Insert energy theses
  console.log('📝 Creating Energy Portfolio theses...');
  for (const thesis of energyTheses) {
    const created = await prisma.investmentThesis.create({
      data: thesis,
    });
    console.log(`  ✅ ${created.title}`);
  }

  // Insert copper theses
  console.log('\n📝 Creating Copper Portfolio theses...');
  for (const thesis of copperTheses) {
    const created = await prisma.investmentThesis.create({
      data: thesis,
    });
    console.log(`  ✅ ${created.title}`);
  }

  // Summary
  const totalTheses = await prisma.investmentThesis.count();
  console.log(`\n✅ Successfully populated ${totalTheses} investment theses!`);
  
  // Show summary by portfolio
  const energyCount = await prisma.investmentThesis.count({
    where: { portfolioId: energyPortfolio.id }
  });
  const copperCount = await prisma.investmentThesis.count({
    where: { portfolioId: copperPortfolio.id }
  });
  
  console.log(`\nSummary:`);
  console.log(`  Energy Portfolio: ${energyCount} theses`);
  console.log(`  Copper Portfolio: ${copperCount} theses`);
}

main()
  .catch((e) => {
    console.error('Error populating theses:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
