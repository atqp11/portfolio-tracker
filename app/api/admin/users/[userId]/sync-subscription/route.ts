import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@lib/stripe/client';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';
import { getTierFromPriceId } from '@lib/stripe/client';

export const dynamic = 'force-dynamic';

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

    const { userId } = await params;
    const supabase = createAdminClient();

    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, tier')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer ID' },
        { status: 400 }
      );
    }

    // Get current subscription from Stripe
    const subscriptions = await getStripe().subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'all',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    
    if (!subscription) {
      // No subscription - ensure user is on free tier
      await supabase
        .from('profiles')
        .update({
          tier: 'free',
          subscription_tier: 'free',
          subscription_status: 'none',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return NextResponse.json({
        success: true,
        action: 'downgraded_to_free',
        reason: 'No active Stripe subscription found',
      });
    }

    // Sync subscription data
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = getTierFromPriceId(priceId) || 'free';

    // Access subscription period dates (type-safe for Stripe v20+)
    const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start;
    const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

    await supabase
      .from('profiles')
      .update({
        tier: tier,
        subscription_tier: tier,
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      action: 'synced',
      tier: tier,
      status: subscription.status,
      period_end: new Date(periodEnd * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
