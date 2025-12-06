import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';
import { getStripe, getPriceIdForTier } from '@lib/stripe/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const changeTierSchema = z.object({
  tier: z.enum(['free', 'basic', 'premium']),
  update_stripe: z.boolean().default(false),
  reason: z.string().min(1),
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
    const validation = changeTierSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { tier, update_stripe, reason } = validation.data;
    const { userId } = await params;

    const supabase = createAdminClient();

    // Get user's subscription
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_tier')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    // Update Stripe subscription
    if (update_stripe && user.stripe_subscription_id) {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      const newPriceId = getPriceIdForTier(tier);

      if (newPriceId) {
        await stripe.subscriptions.update(user.stripe_subscription_id, {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
        });
      }
    }

    // Update tier in database
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ tier: tier, subscription_tier: tier })
      .eq('id', userId);

    if (dbError) {
      throw dbError;
    }

    // Log the action
    // (Implementation of admin_audit_log is omitted for brevity)

    return NextResponse.json({ success: true, newTier: tier });
  } catch (error) {
    console.error('Error changing tier:', error);
    return NextResponse.json(
      { error: 'Failed to change tier' },
      { status: 500 }
    );
  }
}
