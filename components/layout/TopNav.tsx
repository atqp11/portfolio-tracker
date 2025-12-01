'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@lib/supabase/client';
import TierBadge from '@/components/shared/TierBadge';
import { type TierName } from '@lib/tiers';
import { get } from '@lib/utils/idbStorage';

interface TopNavProps {
  title?: string;
}

interface UserData {
  email: string;
  name?: string;
  tier: TierName;
}

interface AlertState {
  stopLoss?: { triggered: boolean; value: number };
  takeProfit?: { triggered: boolean; value: number };
  marginCall?: { triggered: boolean; value: number; equityPercent: number };
}

interface UsageWarnings {
  chatQueries: boolean;
  portfolioAnalysis: boolean;
  secFilings: boolean;
}

interface UsageStats {
  percentages: {
    chatQueries: number;
    portfolioAnalysis: number;
    secFilings: number;
  };
  warnings: UsageWarnings;
}

const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
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
  const router = useRouter();
  const pageTitle = title || getPageTitle(pathname);
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<AlertState | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      try {
        // Get auth user from Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          // Fetch user profile from database
          const response = await fetch(`/api/auth/user?id=${authUser.id}`);
          if (response.ok) {
            const result = await response.json();
            // API returns { success: true, data: { ... } }
            const userData = result.data || result;
            setUser(userData);
          } else {
            // Fallback to auth user data
            setUser({
              email: authUser.email || 'Unknown',
              name: authUser.user_metadata?.name,
              tier: 'free',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [supabase]);

  // Fetch alerts from IndexedDB
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const alertState = await get<AlertState>('alerts');
        if (alertState) {
          setAlerts(alertState);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    }

    fetchAlerts();

    // Poll for alert updates every 5 seconds
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch usage stats for warnings
  useEffect(() => {
    async function fetchUsageStats() {
      try {
        const response = await fetch('/api/user/usage');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            setUsageStats({
              percentages: data.stats.percentages,
              warnings: data.stats.warnings,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching usage stats:', error);
      }
    }

    fetchUsageStats();

    // Poll for usage updates every 30 seconds
    const interval = setInterval(fetchUsageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total notification count
  useEffect(() => {
    let count = 0;
    
    // Count portfolio alerts
    if (alerts?.stopLoss?.triggered) count++;
    if (alerts?.takeProfit?.triggered) count++;
    if (alerts?.marginCall?.triggered) count++;
    
    // Count usage warnings
    if (usageStats?.warnings?.chatQueries) count++;
    if (usageStats?.warnings?.portfolioAnalysis) count++;
    if (usageStats?.warnings?.secFilings) count++;
    
    setNotificationCount(count);
  }, [alerts, usageStats]);

  const handleSignOut = async () => {
    try {
      // Sign out from Supabase client-side first
      await supabase.auth.signOut();

      // Then call the server-side signout endpoint
      await fetch('/api/auth/signout', { method: 'POST' });

      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear local state
      setUser(null);

      // Use window.location for a hard redirect to force full page reload
      // This ensures all cached state is cleared
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

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
            onClick={handleNotificationClick}
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
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 z-50 max-h-96 overflow-y-auto" style={{ top: '60px' }}>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Alerts & Notifications</h3>
              
              {notificationCount === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No active alerts</p>
              ) : (
                <div className="space-y-2">
                  {/* Portfolio Alerts */}
                  {alerts?.stopLoss?.triggered && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">🛑 Stop-Loss Alert</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Portfolio value: ${alerts.stopLoss.value.toFixed(0)}
                      </p>
                    </div>
                  )}
                  
                  {alerts?.takeProfit?.triggered && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">✅ Take-Profit Alert</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Portfolio value: ${alerts.takeProfit.value.toFixed(0)}
                      </p>
                    </div>
                  )}
                  
                  {alerts?.marginCall?.triggered && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">⚠️ Margin Call</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Equity: {alerts.marginCall.equityPercent.toFixed(1)}% (below 30% threshold)
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Portfolio value: ${alerts.marginCall.value.toFixed(0)}
                      </p>
                    </div>
                  )}

                  {/* Usage Warnings */}
                  {usageStats?.warnings?.chatQueries && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">📊 AI Chat Quota Warning</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {usageStats.percentages.chatQueries.toFixed(0)}% of daily limit used
                      </p>
                    </div>
                  )}

                  {usageStats?.warnings?.portfolioAnalysis && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">📈 Portfolio Analysis Quota Warning</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {usageStats.percentages.portfolioAnalysis.toFixed(0)}% of daily limit used
                      </p>
                    </div>
                  )}

                  {usageStats?.warnings?.secFilings && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">📄 SEC Filings Quota Warning</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {usageStats.percentages.secFilings.toFixed(0)}% of monthly limit used
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* View Usage Link */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <a 
                  href="/usage" 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View detailed usage →
                </a>
              </div>
            </div>
          )}

          {/* Tier Badge (Prominent) */}
          {!loading && user && (
            <div className="hidden md:block">
              <TierBadge
                tier={user.tier}
                size="md"
                clickable={true}
              />
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {loading ? '...' : (user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U')}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {loading ? 'Loading...' : (user?.name || user?.email?.split('@')[0] || 'User')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {loading ? '...' : user?.email}
              </p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Sign out"
            title="Sign out"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
