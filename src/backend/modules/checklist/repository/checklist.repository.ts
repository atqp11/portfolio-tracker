/**
 * Daily Checklist Repository
 */
import { BaseRepository } from '@backend/common/repositories/base.repository';
import { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server'; // Import the factory function

type DailyChecklist = Database['public']['Tables']['daily_checklists']['Row'];

/**
 * Repository for daily_checklists table.
 * Provides specific data access methods for checklists.
 */
export class ChecklistRepository extends BaseRepository<DailyChecklist> {
  protected tableName = 'daily_checklists';

  constructor() {
    super(createClient);
      // Configure soft delete or other options if needed in the future
    
  }

  /**
   * Finds a single checklist by its ID, including all associated tasks.
   * @param id - The ID of the checklist.
   * @returns A promise that resolves to the checklist with tasks, or null if not found.
   */
  async findByIdWithTasks(id: string): Promise<DailyChecklist | null> {
    const supabase = await this.ensureClient();
    const query = supabase
      .from(this.tableName)
      .select(`
        *,
        tasks:checklist_tasks (*)
      `)
      .eq('id', id)
      .single();

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST116') return null; // Standard "not found" error code
      throw this.handleError(error, `${this.tableName}.findByIdWithTasks`);
    }
    return data as DailyChecklist | null;
  }

  /**
   * Finds a checklist for a specific portfolio and date, including its tasks.
   * @param portfolioId - The ID of the portfolio.
   * @param date - The specific date for the checklist.
   * @returns A promise that resolves to the checklist with tasks, or null if not found.
   */
  async findByPortfolioIdAndDate(portfolioId: string, date: Date): Promise<DailyChecklist | null> {
    const supabase = await this.ensureClient();
    // Normalize date to just YYYY-MM-DD for comparison if needed, but Supabase can handle timestamps.
    const query = supabase
      .from(this.tableName)
      .select(`
        *,
        tasks:checklist_tasks (*)
      `)
      .eq('portfolio_id', portfolioId)
      .eq('date', date.toISOString()) // Ensure date is in the correct format
      .single();

    const { data, error } = await query;
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw this.handleError(error, `${this.tableName}.findByPortfolioIdAndDate`);
    }
    return data as DailyChecklist | null;
  }

  /**
   * Finds the most recent checklists for a given portfolio, up to a specified limit.
   * @param portfolioId - The ID of the portfolio.
   * @param limit - The maximum number of checklists to return.
   * @returns A promise that resolves to an array of recent checklists with their tasks.
   */
  async findLatestByPortfolioId(portfolioId: string, limit: number = 30): Promise<DailyChecklist[]> {
    const supabase = await this.ensureClient();
    const query = supabase
      .from(this.tableName)
      .select(`
        *,
        tasks:checklist_tasks (*)
      `)
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })
      .limit(limit);

    return this.executeQuery(query, `${this.tableName}.findLatestByPortfolioId`);
  }
}

export const checklistRepository = new ChecklistRepository();
