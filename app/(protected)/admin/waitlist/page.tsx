import { Suspense } from 'react';
import WaitlistClient from './components/WaitlistClient';
import { listWaitlistEntriesData } from '@backend/modules/waitlist/waitlist.controller';
import type { WaitlistEntryDto } from '@backend/modules/waitlist/dto/waitlist.dto';
import { requireAdmin } from '@lib/auth/session';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getWaitlistData(page: number = 1, limit: number = 50) {
  try {
    // Call controller layer (correct pattern for RSC)
    const result = await listWaitlistEntriesData({
      page,
      limit,
      notified: 'all',
    });

    return result;
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return {
      entries: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            Waitlist Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Loading waitlist data...</p>
        </div>
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading waitlist...</p>
        </div>
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<URLSearchParams | Record<string, string | string[]>>;
}

export default async function WaitlistAdminPage({ searchParams }: PageProps) {
  // Require admin access
  await requireAdmin();
  
  // Resolve searchParams (Next.js 16+ async pattern)
  const searchParamsResolved = await searchParams;
  
  // Extract page and limit from search params
  const getParam = (key: string): string | undefined => {
    if (typeof (searchParamsResolved as URLSearchParams).get === 'function') {
      return (searchParamsResolved as URLSearchParams).get(key) ?? undefined;
    }
    const v = (searchParamsResolved as Record<string, string | string[]>)[key];
    return Array.isArray(v) ? v[0] : v;
  };
  
  const page = parseInt(getParam('page') || '1', 10);
  const limit = parseInt(getParam('limit') || '50', 10);
  
  // Server-side data fetching with pagination
  const waitlistData = await getWaitlistData(page, limit);

  return (
    <Suspense fallback={<LoadingState />}>
      <WaitlistClient 
        initialData={waitlistData.entries}
        pagination={waitlistData.pagination}
      />
    </Suspense>
  );
}
