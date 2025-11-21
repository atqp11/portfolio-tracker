/**
 * Custom React hooks for fetching data from database API
 * Phase 5: Frontend Integration
 */

import { useState, useEffect } from 'react';

// Types
export interface Portfolio {
  id: string;
  name: string;
  type: string;
  initialValue: number;
  targetValue: number;
  borrowedAmount: number;
  marginCallLevel: number;
  createdAt: string;
  updatedAt: string;
  stocks?: Stock[];
  theses?: InvestmentThesis[];
  checklists?: DailyChecklist[];
}

export interface Stock {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number | null;
  previousPrice?: number | null;
  actualValue: number | null;
  lastUpdated: string;
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

export interface InvestmentThesis {
  id: string;
  portfolioId: string;
  ticker: string;
  title: string;
  description: string;
  rationale: string;
  bearCase: string | null;
  risks: string[];
  keyMetrics: ThesisMetric[];
  stopLossRules: StopLossRule[];
  exitCriteria: ExitCriteria;
  thesisHealthScore: number;
  urgency: 'green' | 'yellow' | 'red';
  lastValidated: Date | null;
  validationHistory?: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyChecklist {
  id: string;
  portfolioId: string;
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
  tasks?: ChecklistTask[];
}

export interface ChecklistTask {
  id: string;
  checklistId: string;
  portfolioId: string;
  task: string;
  category: string;
  frequency: string;
  urgency: string;
  completed: boolean;
  completedAt: string | null;
  condition: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch all portfolios
 */
export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/portfolio');
      if (!response.ok) throw new Error('Failed to fetch portfolios');

      const data: Portfolio[] = await response.json();
      console.log('[usePortfolios] Fetched portfolios:', data);
      setPortfolios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  return { portfolios, loading, error, refetch: fetchPortfolios };
}

/**
 * Hook to fetch portfolio by type (energy or copper)
 */
export function usePortfolio(type: 'energy' | 'copper') {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all portfolios and find by type
        const response = await fetch('/api/portfolio');
        if (!response.ok) throw new Error('Failed to fetch portfolios');

        const portfolios: Portfolio[] = await response.json();
        console.log('[usePortfolio] Fetched portfolios:', portfolios);
        console.log('[usePortfolio] Looking for type:', type);
        console.log('[usePortfolio] Portfolio types:', portfolios.map(p => ({ id: p.id, name: p.name, type: p.type })));

        const found = portfolios.find(p => p.type === type);
        console.log('[usePortfolio] Found portfolio:', found);

        if (found) {
          setPortfolio(found);
        } else {
          setError(`Portfolio ${type} not found`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
  }, [type]);

  return { portfolio, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook to fetch a single portfolio by ID
 */
export function usePortfolioById(portfolioId: string | null) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    async function fetchPortfolio() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/portfolio?id=${portfolioId}`);
        if (!response.ok) throw new Error('Failed to fetch portfolio');

        const data: Portfolio = await response.json();
        setPortfolio(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
  }, [portfolioId]);

  return { portfolio, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook to fetch stocks for a portfolio
 */
export function useStocks(portfolioId: string | undefined) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    async function fetchStocks() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/stocks?portfolioId=${portfolioId}`);
        if (!response.ok) throw new Error('Failed to fetch stocks');
        
        const data = await response.json();
        setStocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchStocks();
  }, [portfolioId]);

  return { stocks, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook to fetch investment theses for a portfolio
 */
export function useTheses(portfolioId: string | undefined) {
  const [theses, setTheses] = useState<InvestmentThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    async function fetchTheses() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/thesis?portfolioId=${portfolioId}`);
        if (!response.ok) throw new Error('Failed to fetch theses');
        
        const data = await response.json();
        setTheses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchTheses();
  }, [portfolioId]);

  return { theses, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook to fetch today's checklist for a portfolio
 */
export function useChecklist(portfolioId: string | undefined) {
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    async function fetchChecklist() {
      try {
        setLoading(true);
        setError(null);
        
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/checklist?portfolioId=${portfolioId}&date=${today}`);
        if (!response.ok) throw new Error('Failed to fetch checklist');
        
        const data = await response.json();
        setChecklist(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchChecklist();
  }, [portfolioId]);

  return { checklist, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook to calculate portfolio metrics from stocks
 */
export function usePortfolioMetrics(stocks: Stock[], borrowedAmount: number = 0) {
  const [metrics, setMetrics] = useState({
    currentValue: 0,
    costBasis: 0,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    equityValue: 0,
    equityPercent: 0,
    marginCallValue: 0,
  });

  useEffect(() => {
    const currentValue = stocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);
    const costBasis = stocks.reduce((sum, s) => sum + (s.shares * s.avgPrice), 0);
    const unrealizedPL = currentValue - costBasis;
    const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
    
    const equityValue = currentValue - borrowedAmount;
    const equityPercent = currentValue > 0 ? (equityValue / currentValue) * 100 : 0;
    const marginCallValue = borrowedAmount / 0.30; // 30% margin call level

    setMetrics({
      currentValue,
      costBasis,
      unrealizedPL,
      unrealizedPLPercent,
      equityValue,
      equityPercent,
      marginCallValue,
    });
  }, [stocks, borrowedAmount]);

  return metrics;
}
