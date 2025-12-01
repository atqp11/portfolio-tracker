/**
 * User Controller
 *
 * Thin HTTP controller for user operations.
 * Auth is handled by middleware.
 * Delegates business logic to services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@backend/modules/user/service/user.service';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';
import { type TierName } from '@lib/tiers';
import { usageService } from '@backend/modules/user/service/usage.service';

/**
 * Auth context from middleware
 */
interface AuthContext {
  userId: string;
  userTier: TierName;
  profile: {
    id: string;
    tier: string;
  };
}

// Schema for GET request query parameters
const getProfileQuerySchema = z
  .object({
    id: z.string().uuid().optional(),
  })
  .refine(data => data.id, {
    message: 'Profile ID must be provided.',
  });

class UserController {
  async get(request: NextRequest, { query }: { query: z.infer<typeof getProfileQuerySchema> }) {
    if (query.id) {
      const profile = await userService.getProfileById(query.id);
      return NextResponse.json({ success: true, data: profile });
    }
    throw new NotFoundError('Invalid query parameters for getting profiles.');
  }

  /**
   * GET /api/user/usage
   *
   * Returns current usage statistics for authenticated user.
   * Auth is handled by middleware.
   */
  async getUsage(
    request: NextRequest,
    context: { auth: AuthContext }
  ): Promise<NextResponse> {
    const { auth } = context;

    // Delegate to service layer
    const stats = await usageService.getUserUsageStats(
      auth.userId,
      auth.userTier
    );

    return NextResponse.json({
      success: true,
      stats,
    });
  }
}

const userService = new UserService();

export const userController = new UserController();