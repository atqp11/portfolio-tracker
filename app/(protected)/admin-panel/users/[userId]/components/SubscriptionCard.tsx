'use client';

import type { Profile } from '@lib/supabase/db';

interface SubscriptionCardProps {
  user: Profile;
}

export default function SubscriptionCard({ user }: SubscriptionCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-xl font-bold mb-4">Subscription</h2>
      <div>
        <strong>Tier:</strong> {user.tier}
      </div>
      <div>
        <strong>Status:</strong> {user.subscription_status}
      </div>
      <div>
        <strong>Stripe Customer ID:</strong> {user.stripe_customer_id}
      </div>
      <div>
        <strong>Stripe Subscription ID:</strong> {user.stripe_subscription_id}
      </div>
      <div>
        <strong>Current Period:</strong>{' '}
        {user.current_period_start && new Date(user.current_period_start).toLocaleDateString()} -{' '}
        {user.current_period_end && new Date(user.current_period_end).toLocaleDateString()}
      </div>
      <div>
        <strong>Trial Ends:</strong>{' '}
        {user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleString() : 'N/A'}
      </div>
      {/* Add buttons for admin actions here */}
    </div>
  );
}
