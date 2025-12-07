import { getAllUsers, getCurrentUserUsage } from '@lib/supabase/db';
import type { AdminUserDto } from '../dto/admin.dto';

export class UsersService {
  async fetchAllUsersWithUsage(): Promise<AdminUserDto[]> {
    const users = await getAllUsers();

    const usersWithUsage = await Promise.all(
      users.map(async (user: any) => {
        const usage = await getCurrentUserUsage(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name || null,
          tier: user.tier || null,
          is_admin: user.is_admin ?? null,
          is_active: user.is_active ?? null,
          created_at: user.created_at ?? null,
          stripe_customer_id: user.stripe_customer_id ?? null,
          subscription_status: user.subscription_status ?? null,
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
      })
    );

    return usersWithUsage;
  }
}

export const usersService = new UsersService();
