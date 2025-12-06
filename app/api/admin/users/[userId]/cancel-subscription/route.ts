import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@lib/stripe/client';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';

export const dynamic = 'force-dynamic';

const cancelSchema = z.object({
  immediately: z.boolean().default(false), // Cancel at period end by default
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin
    const profile = await getUserProfile();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = cancelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { immediately, reason } = validation.data;
    const { userId } = await params;

    // Get user's subscription
    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_tier, email')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'User has no active subscription' },
        { status: 400 }
      );
    }

    // Cancel subscription
    const idempotencyKey = `cancel_${user.stripe_subscription_id}_${Date.now()}`;
    
    let subscription;
    if (immediately) {
      subscription = await getStripe().subscriptions.cancel(
        user.stripe_subscription_id,
        { idempotencyKey }
      );
    } else {
      subscription = await getStripe().subscriptions.update(
        user.stripe_subscription_id,
        { cancel_at_period_end: true },
        { idempotencyKey }
      );
    }

    // Update user in database
    await supabase
      .from('profiles')
      .update({
        subscription_status: immediately ? 'canceled' : 'active',
        subscription_tier: immediately ? 'free' : user.subscription_tier,
        tier: immediately ? 'free' : user.subscription_tier,
        cancel_at_period_end: !immediately,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Log the action
    await supabase.from('stripe_transactions').insert({
      user_id: userId,
      stripe_subscription_id: user.stripe_subscription_id,
      event_type: 'admin.subscription.canceled',
      tier_before: user.subscription_tier,
      tier_after: immediately ? 'free' : user.subscription_tier,
      status: 'completed',
      idempotency_key: idempotencyKey,
    });

    // Access period end date (type-safe for Stripe v20+)
    const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

    return NextResponse.json({
      success: true,
      cancel_at_period_end: !immediately,
      effective_date: immediately 
        ? 'Immediately' 
        : new Date(periodEnd * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      {
        error: 'Cancellation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        manual_steps: [
          '1. Go to Stripe Dashboard → Subscriptions',
          '2. Search by customer email',
          '3. Click "Cancel subscription"',
          '4. Update user tier in Supabase: profiles.tier = "free"',
        ],
      },
      { status: 500 }
    );
  }
}
