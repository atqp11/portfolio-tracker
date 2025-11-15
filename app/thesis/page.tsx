'use client';

/**
 * Thesis Route - Display investment decisions as thesis cards
 * Phase 3.1: Safe Integration alongside existing dashboard
 */

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { InvestmentThesis } from '@/lib/models';
import ThesisCard from '@/components/ThesisCard';
import { decisionToThesis } from '@/lib/models/thesis';
import Navigation from '@/components/Navigation';

export default function ThesisPage() {
  const [active, setActive] = useState<'energy' | 'copper'>('energy');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [currentValue, setCurrentValue] = useState(0);

  const config = configs.find(c => c.id === active)!;

  // Load portfolio data from cache to get current value
  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        const cacheKey = `portfolio_${active}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setPortfolio(data);
          
          // Calculate current value
          const totalValue = data.reduce((sum: number, stock: any) => {
            return sum + (stock.actualValue || 0);
          }, 0);
          setCurrentValue(totalValue);
        } else {
          setCurrentValue(config.initialValue);
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setCurrentValue(config.initialValue);
      }
    };
    loadPortfolioData();
  }, [active, config]);

  // Calculate margin metrics
  const marginUsed = active === 'energy' ? 6000 : 3000;
  const marginCallValue = marginUsed / 0.70;
  const equityPercent = currentValue > 0 ? ((currentValue - marginUsed) / currentValue) * 100 : 0;

  // Target values
  const targetDeleverValue = active === 'energy' ? 30000 : 15000;
  const targetProfitValue = active === 'energy' ? 30000 : 15000;

  // Convert decisions to thesis format
  const getTheses = (): InvestmentThesis[] => {
    if (active === 'energy') {
      return [
        {
          id: 'thesis_energy_margin',
          portfolioId: 'energy',
          ticker: 'ENERGY_PORTFOLIO',
          title: 'Margin Decision',
          description: '30% margin ($6,000 borrowed vs $14,000 cash). Proportional across CNQ, SU, TRMLF, AETUF, TRP. Each $1 cash controls $1.43 in positions.',
          rationale: `Leverages 2025 LNG export boom (+15% YoY) and stable WTI (~$70/bbl). All positions have Debt/EBITDA < 1.0x. Margin call triggers at $${marginCallValue.toFixed(0)} (equity < 30%).`,
          bearCase: 'Oil crash below $60/bbl, recession reducing energy demand, margin call if equity drops below 30%.',
          risks: ['Oil price volatility', 'Margin call risk', 'Interest rate increases'],
          keyMetrics: [
            {
              name: 'Equity Percentage',
              targetValue: '>45%',
              currentValue: `${equityPercent.toFixed(1)}%`,
              condition: 'Must stay above 45%, margin call at 30%',
              urgency: equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green',
            },
            {
              name: 'Current Portfolio Value',
              targetValue: `>$${marginCallValue.toFixed(0)}`,
              currentValue: `$${currentValue.toFixed(0)}`,
              condition: `Margin call triggers at $${marginCallValue.toFixed(0)}`,
              urgency: currentValue < marginCallValue ? 'red' : currentValue < 16000 ? 'yellow' : 'green',
            },
          ],
          stopLossRules: [
            {
              type: 'margin_call',
              trigger: `Portfolio value drops below $${marginCallValue.toFixed(0)} (equity < 30%)`,
              action: 'Immediately sell positions to meet margin requirements',
              currentDistance: currentValue > marginCallValue ? `$${(currentValue - marginCallValue).toFixed(0)} away` : 'TRIGGERED',
            },
          ],
          exitCriteria: {
            targetValue: targetDeleverValue,
            profitTarget: 150,
            conditions: ['Portfolio reaches $30k', 'WTI falls below $60/bbl', 'NG falls below $2.50'],
          },
          thesisHealthScore: equityPercent < 30 ? 25 : equityPercent < 40 ? 60 : 90,
          urgency: equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green',
          lastValidated: new Date(),
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
        {
          id: 'thesis_energy_delever',
          portfolioId: 'energy',
          ticker: 'ENERGY_PORTFOLIO',
          title: 'Delever Decision',
          description: `Trigger at $30,000 (+50%). Sell $6,000 pro-rata to repay margin, highest beta first (TRMLF → AETUF). Early delever if NG < $2.50 or WTI < $60.`,
          rationale: 'Lock in gains and eliminate leverage risk. High-beta stocks (TRMLF, AETUF) are more volatile and suitable for profit-taking first.',
          keyMetrics: [
            {
              name: 'Distance to Target',
              targetValue: `$${targetDeleverValue.toFixed(0)}`,
              currentValue: `$${currentValue.toFixed(0)}`,
              condition: `${((currentValue / targetDeleverValue) * 100).toFixed(1)}% of target`,
              urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' : currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
            },
          ],
          stopLossRules: [
            {
              type: 'thesis_invalidation',
              trigger: `Portfolio value reaches $${targetDeleverValue.toFixed(0)}`,
              action: 'Execute delever - sell $6,000 pro-rata to repay margin',
            },
          ],
          exitCriteria: {
            targetValue: targetDeleverValue,
            profitTarget: 150,
            conditions: ['Value reaches $30k', 'Lock in 50% gain', 'Eliminate leverage risk'],
          },
          thesisHealthScore: currentValue >= targetDeleverValue * 0.9 ? 30 : currentValue >= targetDeleverValue * 0.75 ? 60 : 90,
          urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' : currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
          lastValidated: new Date(),
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
        {
          id: 'thesis_energy_profit',
          portfolioId: 'energy',
          ticker: 'ENERGY_PORTFOLIO',
          title: 'Profit Taking Decision',
          description: 'At $30,000, trim 50% of top performer, reallocate 50% to cash, 50% to TRP (stable 5.5% dividend). Hold remaining positions.',
          rationale: 'TRP offers defensive positioning with regulated pipeline income and lower volatility, balancing portfolio risk while maintaining energy exposure.',
          keyMetrics: [
            {
              name: 'Distance to Profit Target',
              targetValue: `$${targetProfitValue.toFixed(0)}`,
              currentValue: `$${currentValue.toFixed(0)}`,
              condition: `${((currentValue / targetProfitValue) * 100).toFixed(1)}% of target`,
              urgency: currentValue >= targetProfitValue * 0.9 ? 'yellow' : 'green',
            },
          ],
          stopLossRules: [],
          exitCriteria: {
            targetValue: targetProfitValue,
            profitTarget: 150,
            conditions: ['Trim 50% of top performer', 'Reallocate to TRP and cash'],
          },
          thesisHealthScore: currentValue >= targetProfitValue * 0.9 ? 60 : 90,
          urgency: currentValue >= targetProfitValue * 0.9 ? 'yellow' : 'green',
          lastValidated: new Date(),
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
        {
          id: 'thesis_energy_drip',
          portfolioId: 'energy',
          ticker: 'ENERGY_PORTFOLIO',
          title: 'DRIP Decision',
          description: '100% DRIP, quarterly, commission-free. Cap $40K/issuer/year. Typical yields: CNQ/SU 4-5%, TRP 5.5%, TRMLF/AETUF 2-3%.',
          rationale: 'Maximizes compounding. Canadian energy stocks provide strong dividend growth. Cost basis auto-tracked. Tax-efficient in TFSA/RRSP.',
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
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
      ];
    } else {
      // Copper portfolio
      return [
        {
          id: 'thesis_copper_margin',
          portfolioId: 'copper',
          ticker: 'COPPER_PORTFOLIO',
          title: 'Margin Decision',
          description: '30% margin ($3,000 borrowed vs $7,000 cash). Proportional: FCX 40%, COPX 30%, ERO 15%, HBM 15%. Each $1 cash controls $1.43 positions.',
          rationale: '2025 EV/solar demand surge (+33% YoY). FCX/COPX have low cash costs ($1.50/lb breakeven), safe at current $4+ copper price.',
          keyMetrics: [
            {
              name: 'Equity Percentage',
              targetValue: '>45%',
              currentValue: `${equityPercent.toFixed(1)}%`,
              condition: 'Monitor if copper falls below $3.80/lb',
              urgency: equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green',
            },
          ],
          stopLossRules: [
            {
              type: 'margin_call',
              trigger: `Portfolio value drops below $${marginCallValue.toFixed(0)}`,
              action: 'Sell positions to meet margin requirements',
            },
          ],
          exitCriteria: {
            targetValue: targetDeleverValue,
            profitTarget: 150,
            conditions: ['Portfolio reaches $15k', 'Copper falls below $3.80/lb'],
          },
          thesisHealthScore: equityPercent < 30 ? 25 : equityPercent < 40 ? 60 : 90,
          urgency: equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green',
          lastValidated: new Date(),
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
        {
          id: 'thesis_copper_delever',
          portfolioId: 'copper',
          ticker: 'COPPER_PORTFOLIO',
          title: 'Delever Decision',
          description: `Trigger at $15,000 (+50%). Sell $3,000 to repay margin, highest beta first (ERO → HBM). Early delever if copper < $3.80/lb.`,
          rationale: 'Junior miners (ERO, HBM) have 2-3x leverage to copper price. Trimming reduces downside risk while maintaining core FCX/COPX exposure.',
          keyMetrics: [
            {
              name: 'Distance to Target',
              targetValue: `$${targetDeleverValue.toFixed(0)}`,
              currentValue: `$${currentValue.toFixed(0)}`,
              condition: `${((currentValue / targetDeleverValue) * 100).toFixed(1)}% of target`,
              urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' : currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
            },
          ],
          stopLossRules: [
            {
              type: 'thesis_invalidation',
              trigger: `Portfolio reaches $${targetDeleverValue.toFixed(0)}`,
              action: 'Sell $3,000 pro-rata to repay margin',
            },
          ],
          exitCriteria: {
            targetValue: targetDeleverValue,
            profitTarget: 150,
            conditions: ['Value reaches $15k'],
          },
          thesisHealthScore: currentValue >= targetDeleverValue * 0.9 ? 30 : currentValue >= targetDeleverValue * 0.75 ? 60 : 90,
          urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' : currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
          lastValidated: new Date(),
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
        {
          id: 'thesis_copper_profit',
          portfolioId: 'copper',
          ticker: 'COPPER_PORTFOLIO',
          title: 'Profit Taking Decision',
          description: 'Trim 50% of top performer, reallocate 70% to COPX (diversified ETF), 30% cash.',
          rationale: 'COPX provides exposure to 30+ copper producers, reducing single-stock risk while capturing sector upside.',
          keyMetrics: [],
          stopLossRules: [],
          exitCriteria: {
            targetValue: targetProfitValue,
            profitTarget: 150,
            conditions: ['Trim top performer', 'Reallocate to COPX'],
          },
          thesisHealthScore: currentValue >= targetProfitValue * 0.9 ? 60 : 90,
          urgency: currentValue >= targetProfitValue * 0.9 ? 'yellow' : 'green',
          lastValidated: new Date(),
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
        {
          id: 'thesis_copper_drip',
          portfolioId: 'copper',
          ticker: 'COPPER_PORTFOLIO',
          title: 'DRIP Decision',
          description: '100% DRIP, cap $20K/issuer/year. FCX yields ~2%, miners 0-1%.',
          rationale: 'Limited dividend income, but DRIP ensures reinvestment discipline. Focus on capital appreciation from copper price growth.',
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
          createdAt: new Date('2024-10-01'),
          updatedAt: new Date(),
        },
      ];
    }
  };

  const theses = getTheses();

  const handleValidateThesis = (thesisId: string) => {
    alert(`🔍 Validating thesis: ${thesisId}\n\nThis would trigger AI validation in Phase 5.`);
  };

  const handleEditThesis = (thesisId: string) => {
    alert(`✏️ Edit thesis: ${thesisId}\n\nThis would open editor in Phase 4 (Database).`);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0B0E11] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">
              📋 Investment Thesis
            </h1>
            <p className="text-[#9CA3AF]">
              Decision framework for {active === 'energy' ? 'Energy' : 'Copper'} portfolio
            </p>
          </div>

          {/* Portfolio Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActive('energy')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                active === 'energy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-[#9CA3AF] hover:bg-neutral-700'
              }`}
            >
              ⚡ Energy
            </button>
            <button
              onClick={() => setActive('copper')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                active === 'copper'
                  ? 'bg-orange-600 text-white'
                  : 'bg-neutral-800 text-[#9CA3AF] hover:bg-neutral-700'
              }`}
            >
              🔶 Copper
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="bg-[#0E1114] border border-neutral-800 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">Current Value</p>
              <p className="text-lg font-bold text-[#E5E7EB]">${currentValue.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">Equity %</p>
              <p className={`text-lg font-bold ${
                equityPercent < 30 ? 'text-red-400' : equityPercent < 45 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {equityPercent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">Delever Target</p>
              <p className="text-lg font-bold text-[#E5E7EB]">${targetDeleverValue.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">Profit Target</p>
              <p className="text-lg font-bold text-[#E5E7EB]">${targetProfitValue.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Thesis Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {theses.map((thesis) => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              onValidate={handleValidateThesis}
              onEdit={handleEditThesis}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
