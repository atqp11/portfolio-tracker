/**
 * Billing Controller
 * 
 * HTTP request/response handling for billing endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingService } from './service/billing.service';
import { SuccessResponse, ErrorResponse } from '@lib/types/base/response.dto';
import type { TierName } from '@lib/tiers/config';

/**
 * Auth context injected by withAuthContext middleware
 */
interface BillingAuthContext {
  auth: {
    userId: string;
    userTier: TierName;
    profile: any;
  };
}

export class BillingController {
  /**
   * GET /api/billing/subscription
   * Get current user's subscription details
   */
  async getSubscription(req: NextRequest, context: BillingAuthContext): Promise<NextResponse> {
    const subscriptionData = await billingService.getSubscriptionInfo(context.auth.userId);
    
    return NextResponse.json(
      SuccessResponse.create(subscriptionData),
      { status: 200 }
    );
  }

  /**
   * GET /api/billing/history
   * Get current user's billing history (invoices)
   */
  async getHistory(req: NextRequest, context: BillingAuthContext): Promise<NextResponse> {
    const invoices = await billingService.getBillingHistory(context.auth.userId);
    
    return NextResponse.json(
      SuccessResponse.create(invoices),
      { status: 200 }
    );
  }
}

export const billingController = new BillingController();
