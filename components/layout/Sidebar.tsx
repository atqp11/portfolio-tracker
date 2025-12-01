'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@lib/supabase/client';
import TierBadge from '@/components/shared/TierBadge';
import { type TierName } from '@lib/tiers';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Fundamentals', href: '/fundamentals', icon: '📈' },
  { label: 'Risk Analytics', href: '/risk', icon: '⚠️' },
  { label: 'Thesis Tracker', href: '/thesis', icon: '📝' },
  { label: 'Checklist', href: '/checklist', icon: '✓' },
  { label: 'Usage & Quotas', href: '/usage', icon: '📉' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

const adminNavItem: NavItem = {
  label: 'Admin Panel',
  href: '/admin',
  icon: '👑',
};

interface UserProfile {
  email: string;
  name?: string;
  tier: TierName;
  is_admin: boolean;
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  // Add admin nav item if user is admin
  const navItems = user?.is_admin
    ? [...baseNavItems.slice(0, -1), adminNavItem, baseNavItems[baseNavItems.length - 1]]
    : baseNavItems;

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const response = await fetch(`/api/auth/user?id=${authUser.id}`);
          if (response.ok) {
            const result = await response.json();
            // API returns { success: true, data: { ... } }
            const userData = result.data || result;
            setUser({
              email: userData.email,
              name: userData.name,
              tier: userData.tier as TierName,
              is_admin: userData.is_admin || false,
            });
          } else {
            setUser({
              email: authUser.email || 'Unknown',
              name: authUser.user_metadata?.name,
              tier: 'free',
              is_admin: false,
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

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-gray-900 dark:bg-gray-950 text-white z-50
          transition-all duration-300 ease-in-out
          ${isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {!isCollapsed && (
            <h2 className="text-xl font-bold">Portfolio Tracker</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded hover:bg-gray-800 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="text-xl">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div
            className={`
              flex flex-col gap-3
              ${isCollapsed ? 'items-center' : ''}
            `}
          >
            {/* User Info */}
            <div
              className={`
                flex items-center gap-3
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {loading ? '...' : (user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U')}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {loading ? 'Loading...' : (user?.name || user?.email?.split('@')[0] || 'User')}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {loading ? '...' : user?.email}
                  </p>
                </div>
              )}
            </div>

            {/* Tier Badge */}
            {!isCollapsed && !loading && user && (
              <div className="w-full">
                <TierBadge
                  tier={user.tier}
                  size="sm"
                  clickable={true}
                  className="w-full justify-center"
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Toggle Button (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-gray-900 text-white rounded-lg shadow-lg"
          aria-label="Open sidebar"
        >
          ☰
        </button>
      )}
    </>
  );
}
