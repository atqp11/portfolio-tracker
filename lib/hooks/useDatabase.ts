/**
 * useDatabase.ts
 * 
 * This file contains custom React hooks for interacting with the database API.
 * These hooks are used to fetch and manage data related to portfolios, stocks, investment theses, checklists, and portfolio metrics.
 * 
 * Exports:
 * - usePortfolios: Fetches all portfolios.
 * - usePortfolio: Fetches a portfolio by its type (e.g., 'energy', 'copper').
 * - usePortfolioById: Fetches a portfolio by its ID.
 * - useStocks: Fetches stocks for a specific portfolio.
 * - useTheses: Fetches investment theses for a specific portfolio.
 * - useChecklist: Fetches the daily checklist for a specific portfolio.
 * - usePortfolioMetrics: Calculates portfolio metrics based on stocks and borrowed amounts.
 * 
 * Usage:
 * Import the required hook(s) and use them in your React components to fetch and manage data.
 * Each hook returns the fetched data, loading state, error state, and a refetch function.
 * 
 * Example:
 * ```typescript
 * import { usePortfolios } from '@/lib/hooks/useDatabase';
 * 
 * function PortfolioList() {
 *   const { portfolios, loading, error, refetch } = usePortfolios();
 * 
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error}</p>;
 * 
 *   return (
 *     <ul>
 *       {portfolios.map((portfolio) => (
 *         <li key={portfolio.id}>{portfolio.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 * 
 * Notes:
 * - These hooks are designed for frontend integration and rely on the `/api` endpoints.
 * - Error handling is included to manage API failures gracefully.
 * - The hooks use `useState` and `useEffect` to manage data fetching and state updates.
 */

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

      const result = await response.json();
      const data: Portfolio[] = result.success ? result.data : result; // Handle both old and new format
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

        const result = await response.json();
        const portfolios: Portfolio[] = result.success ? result.data : result; // Handle both old and new format
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

        const result = await response.json();
        const data: Portfolio = result.success ? result.data : result; // Handle both old and new format
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
      setStocks([]);
      setLoading(false);
      return;
    }

    async function fetchStocks() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stocks?portfolioId=${portfolioId}`);
        if (!response.ok) throw new Error('Failed to fetch stocks');

        const result = await response.json();
        // Extract data from wrapped response
        setStocks(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStocks([]);
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
