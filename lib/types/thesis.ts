// Investment thesis data models

export interface InvestmentThesis {
  id: string;
  portfolioId: string;
  holdingId?: string;
  ticker: string;
  
  // Core thesis (from StrategyAccordion DecisionRow)
  title: string;
  description: string;
  rationale: string;
  
  // Bear case
  bearCase?: string;
  risks?: string[];
  
  // Metrics & rules
  keyMetrics: ThesisMetric[];
  stopLossRules: StopLossRule[];
  exitCriteria: ExitCriteria;
  
  // Health tracking
  thesisHealthScore: number; // 0-100
  urgency: 'green' | 'yellow' | 'red';
  lastValidated?: Date;
  validationHistory?: ValidationRecord[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ThesisMetric {
  name: string;
  targetValue: string | number;
  currentValue: string | number;
  condition: string;
  urgency: 'green' | 'yellow' | 'red';
}

export interface StopLossRule {
  type: 'hard_stop' | 'thesis_invalidation' | 'time_based' | 'margin_call';
  trigger: string;
  action: string;
  currentDistance?: string;
}

export interface ExitCriteria {
  targetPrice?: number;
  targetValue: number;
  profitTarget: number;
  timeHorizon?: string;
  conditions: string[];
}

export interface ValidationRecord {
  date: Date;
  aiSummary: string;
  metricsSnapshot: Record<string, any>;
  healthScore: number;
  recommendation: string;
}

/**
 * Helper to convert StrategyAccordion decision to Thesis
 * Preserves existing DecisionRow logic while making it database-ready
 */
export function decisionToThesis(
  decision: {
    title: string;
    description: string;
    rationale: string;
    urgency: 'green' | 'yellow' | 'red';
    triggerCondition?: string;
    action?: string;
  },
  portfolioId: string,
  portfolioType: 'energy' | 'copper'
): InvestmentThesis {
  // Calculate health score based on urgency
  const healthScore = decision.urgency === 'green' ? 90 : 
                      decision.urgency === 'yellow' ? 60 : 30;
  
  // Extract metrics from trigger condition
  const keyMetrics: ThesisMetric[] = decision.triggerCondition ? [
    {
      name: 'Trigger Condition',
      targetValue: 'See description',
      currentValue: 'Monitoring',
      condition: decision.triggerCondition,
      urgency: decision.urgency,
    }
  ] : [];

  // Map action to stop loss rules
  const stopLossRules: StopLossRule[] = [];
  if (decision.action === 'delever') {
    stopLossRules.push({
      type: 'thesis_invalidation',
      trigger: decision.triggerCondition || 'Target value reached',
      action: 'Execute delever - sell pro-rata to repay margin',
    });
  }

  return {
    id: `thesis_${portfolioType}_${decision.title.replace(/\s+/g, '_').toLowerCase()}`,
    portfolioId,
    ticker: `PORTFOLIO_${portfolioType.toUpperCase()}`,
    title: decision.title,
    description: decision.description,
    rationale: decision.rationale,
    keyMetrics,
    stopLossRules,
    exitCriteria: {
      targetValue: 0, // To be populated from portfolio config
      profitTarget: 0, // To be populated from portfolio config
      conditions: decision.triggerCondition ? [decision.triggerCondition] : [],
    },
    thesisHealthScore: healthScore,
    urgency: decision.urgency,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
