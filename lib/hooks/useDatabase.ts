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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/portfolio');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      const result = await response.json();
      return result.success ? result.data : result;
    },
  });
}

/**
 * Hook to fetch portfolio by type (energy or copper)
 */
export function usePortfolio(type: 'energy' | 'copper') {
  return useQuery({
    queryKey: ['portfolio', type],
    queryFn: async () => {
      const response = await fetch('/api/portfolio');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      const result = await response.json();
      const portfolios = result.success ? result.data : result;
      const found = portfolios.find((p: Portfolio) => p.type === type);
      if (!found) throw new Error(`Portfolio ${type} not found`);
      return found;
    },
  });
}

/**
 * Hook to fetch a single portfolio by ID
 */
export function usePortfolioById(portfolioId: string | null) {
  return useQuery({
    queryKey: ['portfolioById', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      const response = await fetch(`/api/portfolio?id=${portfolioId}`);
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!portfolioId,
  });
}

/**
 * Hook to fetch stocks for a portfolio
 */
export function useStocks(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['stocks', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      const response = await fetch(`/api/stocks?portfolioId=${portfolioId}`);
      if (!response.ok) throw new Error('Failed to fetch stocks');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!portfolioId,
  });
}

/**
 * Hook to fetch investment theses for a portfolio
 */
export function useTheses(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['theses', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      const response = await fetch(`/api/thesis?portfolioId=${portfolioId}`);
      if (!response.ok) throw new Error('Failed to fetch theses');
      return await response.json();
    },
    enabled: !!portfolioId,
  });
}

/**
 * Hook to fetch today's checklist for a portfolio
 */
export function useChecklist(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['checklist', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/checklist?portfolioId=${portfolioId}&date=${today}`);
      if (!response.ok) throw new Error('Failed to fetch checklist');
      return await response.json();
    },
    enabled: !!portfolioId,
  });
}

/**
 * Hook to calculate portfolio metrics from stocks
 */
export function usePortfolioMetrics(stocks: Stock[], borrowedAmount: number = 0) {
  return useQuery({
    queryKey: ['portfolioMetrics', stocks, borrowedAmount],
    queryFn: () => {
      const currentValue = stocks.reduce((sum, s) => sum + (s.actualValue || 0), 0);
      const costBasis = stocks.reduce((sum, s) => sum + (s.shares * s.avgPrice), 0);
      const unrealizedPL = currentValue - costBasis;
      const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

      const equityValue = currentValue - borrowedAmount;
      const equityPercent = currentValue > 0 ? (equityValue / currentValue) * 100 : 0;
      const marginCallValue = borrowedAmount / 0.30; // 30% margin call level

      return {
        currentValue,
        costBasis,
        unrealizedPL,
        unrealizedPLPercent,
        equityValue,
        equityPercent,
        marginCallValue,
      };
    },
  });
}
