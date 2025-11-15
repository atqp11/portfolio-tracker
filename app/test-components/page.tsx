'use client';

/**
 * Test page for Phase 2 components
 * Verifies shared UI components and ThesisCard work before integration
 */

import { UrgencyBadge, ExpandableDetails, ActionButton } from '@/components/shared';
import ThesisCard from '@/components/ThesisCard';
import { InvestmentThesis } from '@/lib/models';

export default function TestComponentsPage() {
  // Mock thesis data
  const mockHealthyThesis: InvestmentThesis = {
    id: 'test_energy_margin',
    portfolioId: 'energy',
    ticker: 'ENERGY_PORTFOLIO',
    title: 'Margin Decision - Healthy',
    description: 'Monitor equity percentage and manage margin usage to avoid margin calls.',
    rationale: 'Margin amplifies returns but increases risk. We set clear thresholds to maintain safety.',
    bearCase: 'Oil prices could collapse if recession hits, triggering margin calls.',
    keyMetrics: [
      {
        name: 'Equity Percentage',
        targetValue: '>45%',
        currentValue: '52%',
        condition: 'Must stay above 45%',
        urgency: 'green',
      },
      {
        name: 'Margin Used',
        targetValue: '<$6000',
        currentValue: '$4800',
        condition: 'Keep below initial margin',
        urgency: 'green',
      },
    ],
    stopLossRules: [
      {
        type: 'margin_call',
        trigger: 'Equity drops below 30%',
        action: 'Immediately sell positions to meet margin requirements',
        currentDistance: '22% away',
      },
    ],
    exitCriteria: {
      targetValue: 35000,
      profitTarget: 150,
      conditions: ['Portfolio value reaches $35k', 'Energy sentiment turns bearish'],
    },
    thesisHealthScore: 90,
    urgency: 'green',
    lastValidated: new Date('2024-11-10'),
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-11-10'),
  };

  const mockWarningThesis: InvestmentThesis = {
    id: 'test_energy_delever',
    portfolioId: 'energy',
    ticker: 'ENERGY_PORTFOLIO',
    title: 'Delever Decision - Warning',
    description: 'Target value reached for taking profit and paying down margin debt.',
    rationale: 'Reduce risk by delevering when portfolio reaches target value.',
    keyMetrics: [
      {
        name: 'Portfolio Value',
        targetValue: '$25k',
        currentValue: '$24.8k',
        condition: 'Close to target',
        urgency: 'yellow',
      },
    ],
    stopLossRules: [
      {
        type: 'thesis_invalidation',
        trigger: 'Value reaches $25k',
        action: 'Execute delever - sell pro-rata to repay margin',
      },
    ],
    exitCriteria: {
      targetValue: 25000,
      profitTarget: 78,
      conditions: ['Portfolio reaches delever target'],
    },
    thesisHealthScore: 60,
    urgency: 'yellow',
    lastValidated: new Date('2024-11-12'),
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-11-12'),
  };

  const mockCriticalThesis: InvestmentThesis = {
    id: 'test_copper_margin_critical',
    portfolioId: 'copper',
    ticker: 'COPPER_PORTFOLIO',
    title: 'Margin Decision - CRITICAL',
    description: 'Equity percentage dangerously low - immediate action required.',
    rationale: 'Must maintain equity above 30% to avoid forced liquidation.',
    risks: ['Margin call imminent', 'Forced liquidation risk', 'Loss crystallization'],
    keyMetrics: [
      {
        name: 'Equity Percentage',
        targetValue: '>45%',
        currentValue: '32%',
        condition: 'DANGER ZONE',
        urgency: 'red',
      },
    ],
    stopLossRules: [
      {
        type: 'hard_stop',
        trigger: 'Equity drops below 30%',
        action: 'IMMEDIATE DELEVER - Sell 50% of positions',
        currentDistance: '2% away - URGENT',
      },
    ],
    exitCriteria: {
      targetValue: 15000,
      profitTarget: 0,
      conditions: ['Survive and delever to safety'],
    },
    thesisHealthScore: 25,
    urgency: 'red',
    lastValidated: new Date(),
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date(),
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">
            🧪 Component Test Lab
          </h1>
          <p className="text-[#9CA3AF]">Phase 2: Testing extracted components</p>
        </div>

        {/* Shared Components Section */}
        <section className="bg-[#0E1114] border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#E5E7EB] mb-4">Shared UI Components</h2>
          
          {/* UrgencyBadge Tests */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#9CA3AF] mb-3">UrgencyBadge</h3>
            <div className="flex flex-wrap gap-3">
              <UrgencyBadge urgency="green" size="sm" />
              <UrgencyBadge urgency="green" size="md" />
              <UrgencyBadge urgency="green" size="lg" />
              <UrgencyBadge urgency="yellow" size="md" />
              <UrgencyBadge urgency="red" size="md" />
              <UrgencyBadge urgency="green" size="md" variant="outline" />
              <UrgencyBadge urgency="yellow" size="md" variant="outline" />
              <UrgencyBadge urgency="red" size="md" variant="outline" />
            </div>
          </div>

          {/* ExpandableDetails Test */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#9CA3AF] mb-3">ExpandableDetails</h3>
            <ExpandableDetails
              summary={<span className="underline">Click to expand details</span>}
              summaryClassName="text-[#9CA3AF]"
              contentClassName="text-xs text-[#9CA3AF] italic"
            >
              This is the expandable content. It can contain any React nodes and will smoothly
              transition when opened or closed.
            </ExpandableDetails>
          </div>

          {/* ActionButton Tests */}
          <div>
            <h3 className="text-sm font-semibold text-[#9CA3AF] mb-3">ActionButton</h3>
            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={() => alert('Green clicked')} urgency="green" size="sm">
                ✓ Green Action
              </ActionButton>
              <ActionButton onClick={() => alert('Yellow clicked')} urgency="yellow" size="md">
                ⚠️ Yellow Action
              </ActionButton>
              <ActionButton onClick={() => alert('Red clicked')} urgency="red" size="md" animated>
                🚨 Red Action (Animated)
              </ActionButton>
              <ActionButton onClick={() => alert('Neutral clicked')} urgency="neutral" size="md">
                📊 Neutral Action
              </ActionButton>
              <ActionButton onClick={() => {}} urgency="neutral" size="lg" disabled>
                Disabled Button
              </ActionButton>
            </div>
          </div>
        </section>

        {/* ThesisCard Section */}
        <section>
          <h2 className="text-xl font-bold text-[#E5E7EB] mb-4">ThesisCard Component</h2>
          
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Healthy Thesis */}
            <ThesisCard
              thesis={mockHealthyThesis}
              onValidate={(id) => alert(`Validating thesis: ${id}`)}
              onEdit={(id) => alert(`Editing thesis: ${id}`)}
              onArchive={(id) => alert(`Archiving thesis: ${id}`)}
            />

            {/* Warning Thesis */}
            <ThesisCard
              thesis={mockWarningThesis}
              onValidate={(id) => alert(`Validating thesis: ${id}`)}
              onEdit={(id) => alert(`Editing thesis: ${id}`)}
            />
          </div>

          {/* Critical Thesis - Full Width */}
          <div className="mt-4">
            <ThesisCard
              thesis={mockCriticalThesis}
              onValidate={(id) => alert(`URGENT: Validating thesis: ${id}`)}
              onEdit={(id) => alert(`Editing thesis: ${id}`)}
            />
          </div>

          {/* Compact View */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-[#9CA3AF] mb-3">Compact Mode</h3>
            <ThesisCard thesis={mockHealthyThesis} isCompact />
          </div>
        </section>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
