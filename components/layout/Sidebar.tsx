'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Fundamentals', href: '/fundamentals', icon: '📈' },
  { label: 'Risk Analytics', href: '/risk', icon: '⚠️' },
  { label: 'Thesis Tracker', href: '/thesis', icon: '📝' },
  { label: 'Checklist', href: '/checklist', icon: '✓' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
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
              flex items-center gap-3
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm">👤</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">User</p>
                <p className="text-xs text-gray-400 truncate">Free Tier</p>
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
