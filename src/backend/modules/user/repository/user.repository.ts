/**
 * Profile Repository (Prisma-based for admin operations)
 *
 * Uses Prisma client for full database access, bypassing RLS.
 * Ideal for admin operations.
 *
 * Note: Adjust the Profile type to match your Prisma schema model name
 * (e.g., User, Profile, etc.)
 */

import { User as Profile } from '@prisma/client';
import { PrismaBaseRepository } from '@backend/common/repositories/prisma-base.repository';
import { prisma } from '@/lib/prisma';

export class UserRepository extends PrismaBaseRepository<Profile> {
  protected delegate = prisma.user;

  /**
   * Find profile by email
   */
  async findByEmail(email: string): Promise<Profile | null> {
    return this.findOne([{ field: 'email', operator: 'equals', value: email }]);
  }

  /**
   * Find all admin users
   */
  async findAdmins(): Promise<Profile[]> {
    return this.findAll({
      filters: [{ field: 'is_admin', operator: 'equals', value: true }],
      sort: [{ field: 'created_at', direction: 'desc' }],
    });
  }

  /**
   * Find users by tier
   */
  async findByTier(tier: 'free' | 'basic' | 'premium'): Promise<Profile[]> {
    return this.findAll({
      filters: [{ field: 'tier', operator: 'equals', value: tier }],
      sort: [{ field: 'created_at', direction: 'desc' }],
    });
  }

  /**
   * Update user tier (admin operation)
   */
  async updateTier(userId: string, tier: 'free' | 'basic' | 'premium'): Promise<Profile> {
    return this.update(userId, { tier } as any);
  }

  /**
   * Update admin status (admin operation)
   */
  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<Profile> {
    return this.update(userId, { is_admin: isAdmin } as any);
  }

  /**
   * Get users with pagination
   */
  async getUsersPaginated(page: number = 1, pageSize: number = 20) {
    return this.findPaginated(page, pageSize, {
      sort: [{ field: 'created_at', direction: 'desc' }],
    });
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
