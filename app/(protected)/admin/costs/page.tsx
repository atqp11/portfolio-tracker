import { requireUser, getUserProfile } from '@lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { telemetryController } from '@backend/modules/telemetry/telemetry.controller';
import { getTelemetryStatsRequestSchema } from '@backend/modules/telemetry/zod/telemetry.schemas';
import CostDashboardClient from './components/CostDashboardClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<URLSearchParams | Record<string, string | string[]>>;
}

/**
 * Extract period from searchParams
 */
function extractPeriod(
  searchParams: URLSearchParams | Record<string, string | string[]>
): string | undefined {
  if (typeof (searchParams as URLSearchParams).get === 'function') {
    return (searchParams as URLSearchParams).get('period') ?? undefined;
  }
  const v = (searchParams as Record<string, string | string[]>).period;
  return Array.isArray(v) ? v[0] : v;
}

export default async function CostTrackingDashboard({ searchParams }: PageProps) {
  // Auth guard: Require authentication and admin access
  await requireUser();
  const viewerProfile = await getUserProfile();
  if (!viewerProfile?.is_admin) {
    return redirect('/dashboard');
  }

  // Resolve searchParams (Next.js 16+ async pattern)
  const searchParamsResolved = await searchParams;
  
  // Extract period (controller will validate with Zod)
  const periodParam = extractPeriod(searchParamsResolved);

  // Call controller method (MUST call controller, not service)
  // Controller validates input with Zod and returns DTO
  // Note: Controller's Zod schema has default('24h'), so period can be undefined
  const telemetryData = await telemetryController.getTelemetryStats({
    period: periodParam as '1h' | '24h' | '7d' | '30d' | undefined,
  } as any); // Type assertion needed because Zod input type allows undefined but DTO type is strict

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/admin"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 mb-4 inline-block"
        >
          ← Back to Admin Dashboard
        </Link>

        {/* Client Component for interactive dashboard */}
        <CostDashboardClient 
          initialPeriod={telemetryData.period} 
          initialData={{ 
            stats: telemetryData.stats, 
            warnings: telemetryData.warnings 
          }} 
        />
      </div>
    </div>
  );
}
