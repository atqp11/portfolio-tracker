'use client';

import { usePathname } from 'next/navigation';

interface TopNavProps {
  title?: string;
}

const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/holdings': 'Holdings',
    '/fundamentals': 'Fundamentals',
    '/risk': 'Risk Analytics',
    '/thesis': 'Thesis Tracker',
    '/checklist': 'Daily Checklist',
    '/settings': 'Settings',
  };

  return titles[pathname] || 'Portfolio Tracker';
};

export default function TopNav({ title }: TopNavProps) {
  const pathname = usePathname();
  const pageTitle = title || getPageTitle(pathname);
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentDate}</p>
        </div>

        {/* Right Section - Actions & User Info */}
        <div className="flex items-center gap-4">
          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Refresh data"
            title="Refresh data"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Notifications */}
          <button
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
            aria-label="Notifications"
            title="Notifications"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">User</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Free Tier</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
