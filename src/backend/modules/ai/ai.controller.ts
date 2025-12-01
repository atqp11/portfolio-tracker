/**
 * AI Controller
 * 
 * Thin HTTP controller for AI operations.
 * Auth, validation, cache, and quota are handled by middleware.
 * Delegates business logic to ChatService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@backend/modules/ai/service/chat.service';
import { type ChatRequestDto } from '@backend/modules/ai/dto/chat.dto';

/**
 * Auth context from middleware
 */
interface AuthContext {
  userId: string;
  userTier: string;
}

export class AIController {
  /**
   * POST - Process chat message
   * 
   * Auth, validation, cache check, and quota are handled by middleware.
   * Controller just generates the response.
   */
  async chat(
    request: NextRequest,
    context: { body: ChatRequestDto; auth: AuthContext }
  ) {
    const { body: chatRequest, auth } = context;

    // Generate fresh response (cache miss already checked by middleware)
    const response = await chatService.generateResponse(
      chatRequest,
      auth.userId,
      auth.userTier
    );

    return NextResponse.json(response);
  }

  /**
   * GET - Get chat statistics
   */
  async getStats(request: NextRequest) {
    const stats = await chatService.getChatStats();
    return NextResponse.json({ success: true, data: stats });
  }
}

// Export singleton instance
export const aiController = new AIController();
