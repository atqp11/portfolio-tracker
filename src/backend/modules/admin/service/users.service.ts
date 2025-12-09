import { getAllUsers, getCurrentUserUsage } from '@lib/supabase/db';
import type { AdminUserDto } from '@backend/modules/admin/dto/admin.dto';
import { CaseConverter } from '@lib/transformers/base-transformer';
import { createAdminClient } from '@lib/supabase/admin';

export interface PaginatedUsersResult {
  users: AdminUserDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class UsersService {
  /**
   * Fetch all users with usage data (without pagination)
   * Used for backwards compatibility
   */
  async fetchAllUsersWithUsage(): Promise<AdminUserDto[]> {
    const users = await getAllUsers();

    const usersWithUsage = await Promise.all(
      users.map(async (user: any) => {
        const usage = await getCurrentUserUsage(user.id);
        
        // Transform database fields (snake_case) to API contract (camelCase)
        const userDto = {
          id: user.id,
          email: user.email,
          name: user.name || null,
          tier: user.tier || null,
          isAdmin: user.is_admin ?? null,
          isActive: user.is_active ?? null,
          createdAt: user.created_at ?? null,
          stripeCustomerId: user.stripe_customer_id ?? null,
          subscriptionStatus: user.subscription_status ?? null,
          usage: {
            daily: usage?.daily
              ? {
                  chatQueries: usage.daily.chat_queries,
                  portfolioAnalysis: usage.daily.portfolio_analysis,
                  secFilings: usage.daily.sec_filings,
                }
              : null,
            monthly: usage?.monthly
              ? {
                  chatQueries: usage.monthly.chat_queries,
                  portfolioAnalysis: usage.monthly.portfolio_analysis,
                  secFilings: usage.monthly.sec_filings,
                }
              : null,
          },
        } as AdminUserDto;

        return userDto;
      })
    );

    return usersWithUsage;
  }

  /**
   * Fetch users with usage data and pagination
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Paginated users with metadata
   */
  async fetchUsersWithPagination(page: number = 1, limit: number = 50): Promise<PaginatedUsersResult> {
    const supabase = createAdminClient();

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Fetch total count
    const { count: total } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Fetch paginated users
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated users:', error);
      throw new Error('Failed to fetch users');
    }

    // Fetch usage data for each user
    const usersWithUsage = await Promise.all(
      (users || []).map(async (user: any) => {
        const usage = await getCurrentUserUsage(user.id);
        
        // Transform database fields (snake_case) to API contract (camelCase)
        const userDto = {
          id: user.id,
          email: user.email,
          name: user.name || null,
          tier: user.tier || null,
          isAdmin: user.is_admin ?? null,
          isActive: user.is_active ?? null,
          createdAt: user.created_at ?? null,
          stripeCustomerId: user.stripe_customer_id ?? null,
          subscriptionStatus: user.subscription_status ?? null,
          usage: {
            daily: usage?.daily
              ? {
                  chatQueries: usage.daily.chat_queries,
                  portfolioAnalysis: usage.daily.portfolio_analysis,
                  secFilings: usage.daily.sec_filings,
                }
              : null,
            monthly: usage?.monthly
              ? {
                  chatQueries: usage.monthly.chat_queries,
                  portfolioAnalysis: usage.monthly.portfolio_analysis,
                  secFilings: usage.monthly.sec_filings,
                }
              : null,
          },
        } as AdminUserDto;

        return userDto;
      })
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil((total || 0) / limit);
    const pagination = {
      page,
      limit,
      total: total || 0,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      users: usersWithUsage,
      pagination,
    };
  }
}

export const usersService = new UsersService();
