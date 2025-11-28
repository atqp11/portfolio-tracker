/**
 * Investment Thesis Repository
 */
import { BaseRepository } from '@backend/common/repositories/base.repository';
import { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server'; // Import the factory function

// Define the specific types for InvestmentThesis from the generated Supabase types
type InvestmentThesis = Database['public']['Tables']['investment_theses']['Row'];
type InvestmentThesisInsert = Database['public']['Tables']['investment_theses']['Insert'];
type InvestmentThesisUpdate = Database['public']['Tables']['investment_theses']['Update'];

/**
 * Repository for investment_theses table.
 * Provides specific data access methods for investment theses.
 */
export class ThesisRepository extends BaseRepository<InvestmentThesis> {
  protected tableName = 'investment_theses';

  constructor() {
    super(createClient); // Pass the Supabase client factory
  }

  /**
   * Finds all investment theses associated with a specific portfolio.
   * @param portfolioId - The ID of the portfolio.
   * @returns A promise that resolves to an array of investment theses.
   */
  async findByPortfolioId(portfolioId: string): Promise<InvestmentThesis[]> {
    const supabase = await this.ensureClient();
    const query = supabase
      .from(this.tableName)
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    return this.executeQuery(query, `${this.tableName}.findByPortfolioId`);
  }

  /**
   * Finds all investment theses for a given user by joining through portfolios.
   * This is a more complex query that shows how to handle RLS with joins.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to an array of investment theses.
   */
  async findByUserId(userId: string): Promise<InvestmentThesis[]> {
    const supabase = await this.ensureClient();
    const { data, error } = await supabase
      .from('portfolios')
      .select('investment_theses(*)')
      .eq('user_id', userId);

    if (error) {
      throw this.handleError(error, `${this.tableName}.findByUserId`);
    }

    // The result is an array of objects with a nested array of theses.
    // We need to flatten this into a single array of theses.
    return data.flatMap(p => p.investment_theses || []);
  }
}

export const thesisRepository = new ThesisRepository();
