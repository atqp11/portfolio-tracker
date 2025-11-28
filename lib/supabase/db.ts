/**
 * Supabase Database Helper Functions
 *
 * This file provides type-safe helper functions for database operations
 * Replaces Prisma client with Supabase client
 */

import { createClient } from './server';
import { createAdminClient } from './admin';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'basic' | 'premium';
  is_admin: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_value: number;
  target_value: number;
  borrowed_amount: number;
  margin_call_level: number;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: string;
  portfolio_id: string;
  symbol: string;
  name: string;
  shares: number;
  avg_price: number;
  current_price: number | null;
  actual_value: number | null;
  last_updated: string;
  created_at: string;
}

export interface InvestmentThesis {
  id: string;
  portfolio_id: string;
  ticker: string;
  title: string;
  description: string;
  rationale: string;
  bear_case: string | null;
  risks: string[];
  key_metrics: any; // JSON
  stop_loss_rules: any; // JSON
  exit_criteria: any; // JSON
  thesis_health_score: number;
  urgency: 'green' | 'yellow' | 'red';
  last_validated: string | null;
  validation_history: any; // JSON
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DailyChecklist {
  id: string;
  portfolio_id: string;
  date: string;
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTask {
  id: string;
  checklist_id: string;
  portfolio_id: string;
  task: string;
  category: string;
  frequency: string;
  urgency: string;
  completed: boolean;
  completed_at: string | null;
  condition: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  tier: string;
  chat_queries: number;
  portfolio_analysis: number;
  sec_filings: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

// ============================================================================
// PROFILE HELPERS
// ============================================================================

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Get profile as admin (bypasses RLS)
 * Use this in admin routes to fetch any user's profile
 */
export async function getProfileAsAdmin(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile as admin:', error);
    return null;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}

// ============================================================================
// PORTFOLIO HELPERS
// ============================================================================

export async function getUserPortfolios1(userId: string): Promise<Portfolio[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching portfolios:', error);
    return [];
  }

  return data || [];
}

export async function getPortfolio1(portfolioId: string): Promise<Portfolio | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', portfolioId)
    .single();

  if (error) {
    console.error('Error fetching portfolio:', error);
    return null;
  }

  return data;
}

export async function createPortfolio1(
  portfolio: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>
): Promise<Portfolio | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolios')
    .insert(portfolio)
    .select()
    .single();

  if (error) {
    console.error('Error creating portfolio:', error);
    return null;
  }

  return data;
}

export async function updatePortfolio1(
  portfolioId: string,
  updates: Partial<Omit<Portfolio, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Portfolio | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('portfolios')
    .update(updates)
    .eq('id', portfolioId)
    .select()
    .single();

  if (error) {
    console.error('Error updating portfolio:', error);
    return null;
  }

  return data;
}

export async function deletePortfolio1(portfolioId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId);

  if (error) {
    console.error('Error deleting portfolio:', error);
    return false;
  }

  return true;
}

// ============================================================================
// STOCK HELPERS
// ============================================================================

export async function getPortfolioStocks1(portfolioId: string): Promise<Stock[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('symbol', { ascending: true });

  if (error) {
    console.error('Error fetching stocks:', error);
    return [];
  }

  return data || [];
}

export async function createStock1(
  stock: Omit<Stock, 'id' | 'created_at'>
): Promise<Stock | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stocks')
    .insert(stock)
    .select()
    .single();

  if (error) {
    console.error('Error creating stock:', error);
    return null;
  }

  return data;
}

export async function updateStock1(
  stockId: string,
  updates: Partial<Omit<Stock, 'id' | 'portfolio_id' | 'created_at'>>
): Promise<Stock | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stocks')
    .update(updates)
    .eq('id', stockId)
    .select()
    .single();

  if (error) {
    console.error('Error updating stock:', error);
    return null;
  }

  return data;
}

export async function deleteStock1(stockId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('stocks')
    .delete()
    .eq('id', stockId);

  if (error) {
    console.error('Error deleting stock:', error);
    return false;
  }

  return true;
}

// ============================================================================
// INVESTMENT THESIS HELPERS
// ============================================================================

export async function getPortfolioTheses1(portfolioId: string): Promise<InvestmentThesis[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('investment_theses')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching theses:', error);
    return [];
  }

  return data || [];
}

export async function createThesis1(
  thesis: Omit<InvestmentThesis, 'id' | 'created_at' | 'updated_at'>
): Promise<InvestmentThesis | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('investment_theses')
    .insert(thesis)
    .select()
    .single();

  if (error) {
    console.error('Error creating thesis:', error);
    return null;
  }

  return data;
}

export async function updateThesis1(
  thesisId: string,
  updates: Partial<Omit<InvestmentThesis, 'id' | 'portfolio_id' | 'created_at' | 'updated_at'>>
): Promise<InvestmentThesis | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('investment_theses')
    .update(updates)
    .eq('id', thesisId)
    .select()
    .single();

  if (error) {
    console.error('Error updating thesis:', error);
    return null;
  }

  return data;
}

// ============================================================================
// CHECKLIST HELPERS
// ============================================================================

export async function getPortfolioChecklists1(portfolioId: string): Promise<DailyChecklist[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('daily_checklists')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching checklists:', error);
    return [];
  }

  return data || [];
}

export async function getChecklistTasks1(checklistId: string): Promise<ChecklistTask[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklist_tasks')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data || [];
}

export async function updateTask1(
  taskId: string,
  updates: Partial<Omit<ChecklistTask, 'id' | 'checklist_id' | 'portfolio_id' | 'created_at' | 'updated_at'>>
): Promise<ChecklistTask | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklist_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data;
}

// ============================================================================
// USAGE TRACKING HELPERS
// ============================================================================

export async function getUserUsage1(userId: string): Promise<UsageTracking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('period_start', { ascending: false });

  if (error) {
    console.error('Error fetching usage:', error);
    return [];
  }

  return data || [];
}

export async function createUsageRecord1(
  usage: Omit<UsageTracking, 'id' | 'created_at'>
): Promise<UsageTracking | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('usage_tracking')
    .insert(usage)
    .select()
    .single();

  if (error) {
    console.error('Error creating usage record:', error);
    return null;
  }

  return data;
}

/**
 * Get current usage for the authenticated user (RLS-protected)
 * For use in user-facing dashboard/UI
 */
export async function getCurrentUserUsage(userId: string): Promise<{
  daily: UsageTracking | null;
  monthly: UsageTracking | null;
}> {
  const supabase = await createClient();

  const now = new Date();

  // Get daily usage (current day)
  const dailyStart = new Date(now);
  dailyStart.setUTCHours(0, 0, 0, 0);

  const dailyEnd = new Date(dailyStart);
  dailyEnd.setUTCHours(23, 59, 59, 999);

  const { data: dailyUsage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .gte('period_start', dailyStart.toISOString())
    .lte('period_end', dailyEnd.toISOString())
    .single();

  // Get monthly usage (current month)
  const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthlyEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const { data: monthlyUsage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .gte('period_start', monthlyStart.toISOString())
    .lte('period_end', monthlyEnd.toISOString())
    .single();

  return {
    daily: dailyUsage || null,
    monthly: monthlyUsage || null,
  };
}

// ============================================================================
// ADMIN HELPERS
// ============================================================================

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin === true;
}

/**
 * Get all users (admin only)
 * Uses admin client to bypass RLS
 */
export async function getAllUsers(): Promise<Profile[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }

  return data || [];
}

/**
 * Update user tier (admin only)
 * Uses admin client to bypass RLS
 */
export async function updateUserTier(
  userId: string,
  tier: 'free' | 'basic' | 'premium'
): Promise<Profile | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ tier })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user tier:', error);
    return null;
  }

  return data;
}

/**
 * Update user admin status (admin only)
 * Uses admin client to bypass RLS
 */
export async function updateUserAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<Profile | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user admin status:', error);
    return null;
  }

  return data;
}
