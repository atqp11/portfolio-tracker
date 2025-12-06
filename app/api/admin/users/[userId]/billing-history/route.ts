import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';
import { getStripe } from '@lib/stripe/client';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer ID' },
        { status: 400 }
      );
    }

    // Get charges from Stripe
    const stripe = getStripe();
    const charges = await stripe.charges.list({
      customer: user.stripe_customer_id,
      limit: 100, // Adjust as needed
    });

    return NextResponse.json(charges.data);
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}
