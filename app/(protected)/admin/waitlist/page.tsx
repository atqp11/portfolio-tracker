import { Suspense } from 'react';
import WaitlistClient from './components/WaitlistClient';
import { listWaitlistEntries } from '@backend/modules/waitlist/service/waitlist.service';
import type { WaitlistEntryDto } from '@backend/modules/waitlist/dto/waitlist.dto';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getWaitlistData(): Promise<WaitlistEntryDto[]> {
  try {
    // Call service layer directly (Server Component)
    const result = await listWaitlistEntries({
      page: 1,
      limit: 1000,
      notified: 'all',
    });

    return result.entries;
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return [];
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

export default async function WaitlistAdminPage() {
  // Server-side data fetching
  const waitlistData = await getWaitlistData();

  return (
    <Suspense fallback={<LoadingState />}>
      <WaitlistClient initialData={waitlistData} />
    </Suspense>
  );
}
