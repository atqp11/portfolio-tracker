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
    isAdmin: false, // Updated to camelCase
    createdAt: new Date().toISOString(), // Updated to camelCase
    updatedAt: new Date().toISOString(), // Updated to camelCase
  },
  basicUser: {
    id: generateTestId('user'),
    email: 'basic@test.com',
    name: 'Basic User',
    tier: 'basic' as const,
    isAdmin: false, // Updated to camelCase
    createdAt: new Date().toISOString(), // Updated to camelCase
    updatedAt: new Date().toISOString(), // Updated to camelCase
  },
  premiumUser: {
    id: generateTestId('user'),
    email: 'premium@test.com',
    name: 'Premium User',
    tier: 'premium' as const,
    isAdmin: false, // Updated to camelCase
    createdAt: new Date().toISOString(), // Updated to camelCase
    updatedAt: new Date().toISOString(), // Updated to camelCase
  },
  adminUser: {
    id: generateTestId('user'),
    email: 'admin@test.com',
    name: 'Admin User',
    tier: 'premium' as const,
    isAdmin: true, // Updated to camelCase
    createdAt: new Date().toISOString(), // Updated to camelCase
    updatedAt: new Date().toISOString(), // Updated to camelCase
  },
};

/**
 * Mock portfolio data
 */
export function createMockPortfolio(userId: string, overrides: any = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000', // Updated to a valid UUID
    userId: userId, // Updated to camelCase
    name: 'Test Portfolio',
    type: 'Investment',
    initialValue: 10000, // Updated to camelCase
    targetValue: 15000, // Updated to camelCase
    borrowedAmount: 0, // Updated to camelCase
    marginCallLevel: 30, // Updated to camelCase
    createdAt: new Date().toISOString(), // Updated to camelCase
    lastUpdated: new Date().toISOString(), // Renamed from updated_at
    ...overrides,
  };
}

/**
 * Mock stock data
 */
export function createMockStock(portfolioId: string, overrides: any = {}) {
  return {
    id: generateTestId('stock'),
    portfolioId: portfolioId, // Updated to camelCase
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 10,
    avgPrice: 150.00, // Updated to camelCase
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
export const mockTask = {
  id: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID
  checklist_id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
  portfolio_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
  task: 'Review portfolio performance',
  category: 'general',
  frequency: 'daily',
  urgency: 3,
  completed: false,
  completed_at: null,
  condition: null,
  due_date: '2024-12-31T23:59:59Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

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
