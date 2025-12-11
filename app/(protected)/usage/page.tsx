/**
 * Usage Page - React Server Component
 *
 * Displays user usage statistics and quotas for subscription tiers.
 * Server-rendered for optimal performance and SEO.
 *
 * Architecture:
 * - Server Component (RSC) fetches initial data
 * - Client Component handles interactivity and auto-refresh
 * - Server Actions provide data operations
 */

import { requireUser } from '@lib/auth/session';
import { fetchUsageStats } from './actions';
import UsageClient from './UsageClient';

export const metadata = {
  title: 'Usage & Quotas | Portfolio Tracker',
  description: 'Monitor your API usage and subscription limits',
};

export default async function UsagePage() {
  // Require authentication - redirects to signin if not authenticated
  await requireUser();

  // Fetch initial usage statistics
  const stats = await fetchUsageStats();

  // Render client component with initial data
  return <UsageClient initialStats={stats} />;
}
