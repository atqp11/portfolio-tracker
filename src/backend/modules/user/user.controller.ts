import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@backend/modules/user/service/user.service';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';
import { getUserProfile } from '@lib/auth/session';
import { type TierName } from '@lib/tiers';
import { usageService } from '@backend/modules/user/service/usage.service';

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
   * Uses RLS-protected SSR client for security.
   */
  async getUsage(request: NextRequest): Promise<NextResponse> {
    try {
      // Authenticate user
      const profile = await getUserProfile();
      
      if (!profile) {
        return NextResponse.json(
          { 
            error: 'Authentication required. Please sign in to view your usage statistics.' 
          },
          { status: 401 }
        );
      }
      
      // Delegate to service layer
      const stats = await usageService.getUserUsageStats(
        profile.id,
        profile.tier as TierName
      );
      
      return NextResponse.json({
        success: true,
        stats,
      });
      
    } catch (error) {
      console.error('❌ Error fetching user usage:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error 
            ? error.message 
            : 'Failed to fetch usage stats',
          details: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 }
      );
    }
  }
}

const userService = new UserService();

export const userController = new UserController();