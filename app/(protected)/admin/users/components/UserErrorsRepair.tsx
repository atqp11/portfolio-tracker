import { adminController } from '@backend/modules/admin/admin.controller';
import { createAdminClient } from '@lib/supabase/admin';
import Link from 'next/link';
import UserErrorsRepairClient from './UserErrorsRepairClient';

interface WebhookFailure {
  id: string;
  event_type: string;
  created_at: string;
}

interface UserError {
  userId: string;
  email: string;
  errorType: 'subscription_incomplete' | 'subscription_past_due' | 'webhook_failed';
  message: string;
  subscriptionStatus?: string;
  webhookFailures?: WebhookFailure[]; // All failures
  webhookCount?: number; // Count for badge
}

async function getUsersWithErrors(): Promise<UserError[]> {
  const errors: UserError[] = [];

  // Get users with subscription errors
  const incompleteUsers = await adminController.getUsersData({ status: 'incomplete' });
  const incompleteExpiredUsers = await adminController.getUsersData({ status: 'incomplete_expired' });
  const pastDueUsers = await adminController.getUsersData({ status: 'past_due' });

  incompleteUsers.users.forEach(user => {
    errors.push({
      userId: user.id,
      email: user.email || 'Unknown',
      errorType: 'subscription_incomplete',
      message: `Subscription stuck in incomplete status`,
      subscriptionStatus: user.subscription_status || 'incomplete',
    });
  });

  incompleteExpiredUsers.users.forEach(user => {
    errors.push({
      userId: user.id,
      email: user.email || 'Unknown',
      errorType: 'subscription_incomplete',
      message: `Subscription expired (incomplete_expired)`,
      subscriptionStatus: user.subscription_status || 'incomplete_expired',
    });
  });

  pastDueUsers.users.forEach(user => {
    if (user.tier !== 'free') {
      errors.push({
        userId: user.id,
        email: user.email || 'Unknown',
        errorType: 'subscription_past_due',
        message: `Subscription is past due`,
        subscriptionStatus: user.subscription_status || 'past_due',
      });
    }
  });

  // Get users with failed webhook transactions - collect ALL failures per user
  const supabase = createAdminClient();
  const { data: failedTransactions } = await supabase
    .from('stripe_transactions')
    .select('user_id, id, event_type, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(200); // Get more to group by user

  if (failedTransactions) {
    // Group all failures by user_id
    const userIdToFailures: Record<string, WebhookFailure[]> = {};
    
    failedTransactions.forEach((tx: any) => {
      if (tx.user_id) {
        if (!userIdToFailures[tx.user_id]) {
          userIdToFailures[tx.user_id] = [];
        }
        userIdToFailures[tx.user_id].push({
          id: tx.id,
          event_type: tx.event_type || 'unknown',
          created_at: tx.created_at || new Date().toISOString(),
        });
      }
    });

    // Limit to 20 most recent failures per user
    Object.keys(userIdToFailures).forEach(userId => {
      userIdToFailures[userId] = userIdToFailures[userId]
        .slice(0, 20)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Fetch user emails for users with failed webhooks
    if (Object.keys(userIdToFailures).length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', Object.keys(userIdToFailures));

      if (users) {
        users.forEach(user => {
          const failures = userIdToFailures[user.id];
          if (failures && failures.length > 0) {
            const latestFailure = failures[0];
            errors.push({
              userId: user.id,
              email: user.email || 'Unknown',
              errorType: 'webhook_failed',
              message: `Latest webhook failed: ${latestFailure.event_type}`,
              webhookFailures: failures,
              webhookCount: failures.length,
            });
          }
        });
      }
    }
  }

  return errors;
}

export default async function UserErrorsRepair() {
  const errors = await getUsersWithErrors();

  if (errors.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">User Errors & Repair</h2>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <span className="text-xl">✓</span>
          <span>No errors found</span>
        </div>
      </div>
    );
  }

  return <UserErrorsRepairClient errors={errors} />;
}
