'use client';

import type { Profile } from '@lib/supabase/db';

interface SubscriptionCardProps {
  user: Profile;
}

export default function SubscriptionCard({ user }: SubscriptionCardProps) {
  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">Subscription</h2>
      <div className="text-gray-300">
        <strong className="text-gray-200">Tier:</strong> {user.tier}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Status:</strong> {user.subscription_status}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Stripe Customer ID:</strong> {user.stripe_customer_id}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Stripe Subscription ID:</strong> {user.stripe_subscription_id}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Current Period:</strong>{' '}
        {user.current_period_start && new Date(user.current_period_start).toLocaleDateString()} -{' '}
        {user.current_period_end && new Date(user.current_period_end).toLocaleDateString()}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Trial Ends:</strong>{' '}
        {user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleString() : 'N/A'}
      </div>
      {/* Add buttons for admin actions here */}
    </div>
  );
}
