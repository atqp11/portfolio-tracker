/**
 * Mock Data
 *
 * Reusable mock data for testing.
 */

import { generateTestId } from './test-utils';

/**
 * Mock user data
 */
export const mockUsers = {
  freeUser: {
    id: generateTestId('user'),
    email: 'free@test.com',
    name: 'Free User',
    tier: 'free' as const,
    is_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  basicUser: {
    id: generateTestId('user'),
    email: 'basic@test.com',
    name: 'Basic User',
    tier: 'basic' as const,
    is_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  premiumUser: {
    id: generateTestId('user'),
    email: 'premium@test.com',
    name: 'Premium User',
    tier: 'premium' as const,
    is_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  adminUser: {
    id: generateTestId('user'),
    email: 'admin@test.com',
    name: 'Admin User',
    tier: 'premium' as const,
    is_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

/**
 * Mock portfolio data
 */
export function createMockPortfolio(userId: string, overrides: any = {}) {
  return {
    id: generateTestId('portfolio'),
    user_id: userId,
    name: 'Test Portfolio',
    type: 'Investment',
    initial_value: 10000,
    target_value: 15000,
    borrowed_amount: 0,
    margin_call_level: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock stock data
 */
export function createMockStock(portfolioId: string, overrides: any = {}) {
  return {
    id: generateTestId('stock'),
    portfolio_id: portfolioId,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 10,
    avg_price: 150.00,
    current_price: 175.00,
    actual_value: 1750.00,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock investment thesis data
 */
export function createMockThesis(portfolioId: string, overrides: any = {}) {
  return {
    id: generateTestId('thesis'),
    portfolio_id: portfolioId,
    ticker: 'AAPL',
    title: 'Apple Growth Thesis',
    description: 'Strong fundamentals and growth potential',
    rationale: 'Leading market position in consumer electronics',
    bear_case: 'Increased competition and market saturation',
    risks: ['Market competition', 'Regulatory changes'],
    key_metrics: { pe_ratio: 25, revenue_growth: 0.15 },
    stop_loss_rules: { percentage: 0.20 },
    exit_criteria: { target_price: 200 },
    thesis_health_score: 75,
    urgency: 'green' as const,
    last_validated: null,
    validation_history: [],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock checklist data
 */
export function createMockChecklist(portfolioId: string, overrides: any = {}) {
  return {
    id: generateTestId('checklist'),
    portfolio_id: portfolioId,
    date: new Date().toISOString().split('T')[0],
    total_tasks: 5,
    completed_tasks: 2,
    completion_percentage: 40,
    current_streak: 3,
    longest_streak: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock task data
 */
export function createMockTask(checklistId: string, portfolioId: string, overrides: any = {}) {
  return {
    id: generateTestId('task'),
    checklist_id: checklistId,
    portfolio_id: portfolioId,
    task: 'Review market conditions',
    category: 'daily',
    frequency: 'daily',
    urgency: 'medium',
    completed: false,
    completed_at: null,
    condition: null,
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock usage tracking data
 */
export function createMockUsage(userId: string, overrides: any = {}) {
  return {
    id: generateTestId('usage'),
    user_id: userId,
    tier: 'free',
    chat_queries: 5,
    portfolio_analysis: 2,
    sec_filings: 0,
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
