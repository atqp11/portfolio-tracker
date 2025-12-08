import SubscriptionOverview from './components/SubscriptionOverview';
import UserBillingHistory from './components/UserBillingHistory';
import { headers } from 'next/headers';
import type { SubscriptionData } from '@lib/types/billing';
import type Stripe from 'stripe';

/**
 * Server Component - Fetches billing data on the server
 * 
 * Benefits:
 * - Initial data loaded before page render (better UX)
 * - No loading states needed
 * - Reduced client-side JavaScript
 * - SEO-friendly
 */
export default async function BillingPage(): Promise<React.JSX.Element> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  let subscriptionData: SubscriptionData | null = null;
  let invoices: Stripe.Invoice[] = [];

  try {
    // Fetch subscription data from API
    const subscriptionResponse = await fetch(`${baseUrl}/api/billing/subscription`, {
      headers: {
        cookie: headersList.get('cookie') || '',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (subscriptionResponse.ok) {
      const subResult = await subscriptionResponse.json();
      if (subResult.success) {
        subscriptionData = subResult.data;
      }
    }

    // Fetch billing history from API
    const historyResponse = await fetch(`${baseUrl}/api/billing/history`, {
      headers: {
        cookie: headersList.get('cookie') || '',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (historyResponse.ok) {
      const histResult = await historyResponse.json();
      if (histResult.success) {
        invoices = histResult.data;
      }
    }
  } catch (error) {
    console.error('Error fetching billing data:', error);
    // Continue rendering with empty data rather than crashing
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your subscription, view billing history, and update payment methods.
        </p>
      </div>

      <div className="space-y-6">
        {subscriptionData ? (
          <SubscriptionOverview subscriptionData={subscriptionData} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400">No subscription information available.</p>
          </div>
        )}

        <UserBillingHistory invoices={invoices} />
      </div>
    </div>
  );
}
