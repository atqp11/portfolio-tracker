/**
 * Stock Repository (Supabase-based with RLS)
 *
 * Uses Supabase client for RLS-protected stock operations.
 * Use this for regular user operations.
 */

import { createClient } from '@lib/supabase/server';
import { Database } from '@lib/supabase/database.types';

type Stock = Database['public']['Tables']['stocks']['Row'];
type StockInsert = Database['public']['Tables']['stocks']['Insert'];
type StockUpdate = Database['public']['Tables']['stocks']['Update'];

export class StockRepository {
  /**
   * Find all stocks for a portfolio (RLS enforced)
   */
  async findByPortfolioId(portfolioId: string): Promise<Stock[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error fetching stocks:', error);
      throw new Error(`Failed to fetch stocks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find stock by ID (RLS enforced - user can only access their own)
   */
  async findById(id: string): Promise<Stock | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching stock:', error);
      throw new Error(`Failed to fetch stock: ${error.message}`);
    }

    return data;
  }

  /**
   * Create stock (RLS enforced - portfolio ownership checked)
   */
  async create(data: StockInsert): Promise<Stock> {
    const supabase = await createClient();

    const { data: stock, error } = await supabase
      .from('stocks')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating stock:', error);
      throw new Error(`Failed to create stock: ${error.message}`);
    }

    return stock;
  }

  /**
   * Update stock (RLS enforced - user can only update their own)
   */
  async update(id: string, data: StockUpdate): Promise<Stock> {
    const supabase = await createClient();

    const { data: stock, error } = await supabase
      .from('stocks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Stock not found or access denied');
      }
      console.error('Error updating stock:', error);
      throw new Error(`Failed to update stock: ${error.message}`);
    }

    return stock;
  }

  /**
   * Delete stock (RLS enforced - user can only delete their own)
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('stocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting stock:', error);
      throw new Error(`Failed to delete stock: ${error.message}`);
    }
  }
}

// Export singleton instance
export const stockRepository = new StockRepository();
