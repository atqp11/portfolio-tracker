/**
 * AI Controller
 * 
 * Thin HTTP controller for AI operations.
 * Delegates business logic to ChatService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@backend/modules/ai/service/chat.service';
import { chatRequestSchema, type ChatRequestDto } from '@backend/modules/ai/dto/chat.dto';
import { getUserProfile } from '@lib/auth/session';
import { checkAndTrackUsage, type TierName } from '@lib/tiers';

export class AIController {
  /**
   * POST - Process chat message
   */
  async chat(request: NextRequest) {
    const startTime = Date.now();

    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = chatRequestSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { 
            error: 'Invalid request', 
            details: validation.error.issues 
          },
          { status: 400 }
        );
      }

      const chatRequest: ChatRequestDto = validation.data;

      // Authenticate user
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Step 1: Check cache FIRST (before quota check)
      // Cached responses don't count against quota
      const cachedResponse = await chatService.checkCache(chatRequest);
      if (cachedResponse) {
        return NextResponse.json(cachedResponse);
      }

      // Step 2: Cache miss - check and track quota
      const quotaCheck = await checkAndTrackUsage(
        profile.id,
        'chatQuery',
        profile.tier as TierName
      );

      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Quota exceeded',
            reason: quotaCheck.reason,
            upgradeUrl: '/pricing',
          },
          { status: 429 }
        );
      }

      // Step 3: Generate fresh response (quota approved)
      const response = await chatService.generateResponse(
        chatRequest,
        profile.id,
        profile.tier
      );

      return NextResponse.json(response);
    } catch (error) {
      console.error('AI chat error:', error);

      // Log error via service
      if (error instanceof Error) {
        chatService.logError(error, startTime);
      }

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'AI chat failed',
        },
        { status: 500 }
      );
    }
  }

  /**
   * GET - Get chat statistics
   */
  async getStats(request: NextRequest) {
    try {
      const stats = await chatService.getChatStats();
      return NextResponse.json(stats);
    } catch (error) {
      console.error('Error fetching chat stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }
  }
}

// Export singleton instance
export const aiController = new AIController();
