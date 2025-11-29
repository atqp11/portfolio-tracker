/**
 * Portfolio Repository (Supabase-based with RLS)
 *
 * Uses Supabase client for RLS-protected operations.
 * Use this for regular user operations.
 */

import { createClient } from '@lib/supabase/server';
import { Database } from '@lib/supabase/database.types';

type Portfolio = Database['public']['Tables']['portfolios']['Row'];
type PortfolioInsert = Database['public']['Tables']['portfolios']['Insert'];
type PortfolioUpdate = Database['public']['Tables']['portfolios']['Update'];

export class PortfolioRepository {
  /**
   * Find all portfolios for authenticated user (RLS enforced)
   */
  async findAll(options?: { includeRelations?: boolean }): Promise<Portfolio[]> {
    const supabase = await createClient();

    if (options?.includeRelations) {
      // Query with relations - use type assertion for complex nested query
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          stocks (*),
          investment_theses (*),
          daily_checklists (
            *,
            checklist_tasks (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolios:', error);
        throw new Error(`Failed to fetch portfolios: ${error.message}`);
      }

      return (data || []) as any; // Type assertion for relations
    } else {
      // Simple query without relations - properly typed
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolios:', error);
        throw new Error(`Failed to fetch portfolios: ${error.message}`);
      }

      return data || [];
    }
  }

  /**
   * Find portfolio by ID (RLS enforced - user can only access their own)
   */
  async findById(id: string, options?: { includeRelations?: boolean }): Promise<Portfolio | null> {
    const supabase = await createClient();

    if (options?.includeRelations) {
      // Query with relations - use type assertion for complex nested query
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          stocks (*),
          investment_theses (*),
          daily_checklists (
            *,
            checklist_tasks (*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching portfolio:', error);
        throw new Error(`Failed to fetch portfolio: ${error.message}`);
      }

      return data as any; // Type assertion for relations
    } else {
      // Simple query without relations - properly typed
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching portfolio:', error);
        throw new Error(`Failed to fetch portfolio: ${error.message}`);
      }

      return data;
    }
  }

  /**
   * Create portfolio (RLS enforced - automatically uses authenticated user)
   */
  async create(data: Omit<PortfolioInsert, 'user_id'>): Promise<any> {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .insert({
        ...data,
        user_id: user.id,
      })
      .select(`
        *,
        stocks (*),
        investment_theses (*),
        daily_checklists (*)
      `)
      .single();

    if (error) {
      console.error('Error creating portfolio:', error);
      throw new Error(`Failed to create portfolio: ${error.message}`);
    }

    return portfolio as any; // Type assertion for relations
  }

  /**
   * Update portfolio (RLS enforced - user can only update their own)
   */
  async update(id: string, data: PortfolioUpdate): Promise<any> {
    const supabase = await createClient();

    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        stocks (*),
        investment_theses (*),
        daily_checklists (*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Portfolio not found or access denied');
      }
      console.error('Error updating portfolio:', error);
      throw new Error(`Failed to update portfolio: ${error.message}`);
    }

    return portfolio as any; // Type assertion for relations
  }

  /**
   * Delete portfolio (RLS enforced - user can only delete their own)
   */
  async delete(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting portfolio:', error);
      throw new Error(`Failed to delete portfolio: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Check if user owns portfolio (RLS enforced)
   */
  async isOwner(portfolioId: string): Promise<boolean> {
    const portfolio = await this.findById(portfolioId);
    return portfolio !== null;
  }
}

// Export singleton instance
export const portfolioRepository = new PortfolioRepository();
