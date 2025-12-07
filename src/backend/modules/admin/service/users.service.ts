import { getAllUsers, getCurrentUserUsage } from '@lib/supabase/db';
import type { AdminUserDto } from '@backend/modules/admin/dto/admin.dto';
import { CaseConverter } from '@lib/transformers/base-transformer';

export class UsersService {
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
}

export const usersService = new UsersService();
