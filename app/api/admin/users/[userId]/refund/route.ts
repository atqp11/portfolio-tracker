import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@lib/stripe/client';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';

export const dynamic = 'force-dynamic';

const refundSchema = z.object({
  amount_cents: z.number().int().positive().optional(), // Partial refund
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  note: z.string().max(500).optional(),
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
    const validation = refundSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { amount_cents, reason, note } = validation.data;
    const { userId } = await params;

    // Get user's Stripe info
    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer ID' },
        { status: 400 }
      );
    }

    // Get latest payment intent
    const charges = await getStripe().charges.list({
      customer: user.stripe_customer_id,
      limit: 1,
    });

    if (!charges.data.length) {
      return NextResponse.json(
        { error: 'No charges found for this customer' },
        { status: 400 }
      );
    }

    const charge = charges.data[0];

    // Create refund with idempotency key
    const idempotencyKey = `refund_${charge.id}_${Date.now()}`;
    const refund = await getStripe().refunds.create(
      {
        charge: charge.id,
        amount: amount_cents, // Omit for full refund
        reason: reason,
        metadata: {
          admin_user_id: profile.id,
          note: note || '',
          target_user_id: userId,
        },
      },
      { idempotencyKey }
    );

    // Log the refund
    await supabase.from('stripe_transactions').insert({
      user_id: userId,
      stripe_customer_id: user.stripe_customer_id,
      event_type: 'refund.created',
      amount_cents: refund.amount,
      currency: refund.currency,
      status: refund.status === 'succeeded' ? 'completed' : 'pending',
      idempotency_key: idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      {
        error: 'Refund failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        manual_steps: [
          '1. Go to Stripe Dashboard → Payments',
          '2. Find the charge by customer email',
          '3. Click "Refund" and enter the amount',
          '4. Update user tier in Supabase if needed',
        ],
      },
      { status: 500 }
    );
  }
}
