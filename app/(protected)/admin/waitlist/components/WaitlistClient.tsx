'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { WaitlistEntryDto } from '@backend/modules/waitlist/dto/waitlist.dto';

interface WaitlistClientProps {
  initialData: WaitlistEntryDto[];
}

export default function WaitlistClient({ initialData }: WaitlistClientProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Client-side filtering using useMemo for performance
  const filteredWaitlist = useMemo(() => {
    if (!searchTerm) return initialData;
    
    const lowerSearch = searchTerm.toLowerCase();
    return initialData.filter(entry =>
      entry.email.toLowerCase().includes(lowerSearch) ||
      (entry.name && entry.name.toLowerCase().includes(lowerSearch))
    );
  }, [initialData, searchTerm]);

  const stats = useMemo(() => ({
    total: initialData.length,
    notified: initialData.filter(e => e.notified).length,
    pending: initialData.filter(e => !e.notified).length,
  }), [initialData]);

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Notified', 'Joined Date'];
    const rows = filteredWaitlist.map(entry => [
      entry.email,
      entry.name || '',
      entry.notified ? 'Yes' : 'No',
      new Date(entry.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    // Trigger a client-side navigation to refresh the page data
    window.location.reload();
  };

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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            Waitlist Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and view users who have joined the waitlist
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Signups</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notified Users</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.notified}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white"
              >
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredWaitlist.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Waitlist Table */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          {filteredWaitlist.length === 0 ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No results found' : 'No waitlist entries yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Joined Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredWaitlist.map((entry) => (
                    <tr 
                      key={entry.id} 
                      className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {entry.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.notified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                            Notified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredWaitlist.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredWaitlist.length} of {stats.total} entries
          </div>
        )}
      </div>
    </div>
  );
}
