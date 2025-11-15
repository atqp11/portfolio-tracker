'use client';

/**
 * Navigation Component - Top navigation bar for all routes
 * Phase 3.3: Safe Integration - Navigation between routes
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/thesis', label: 'Thesis', icon: '💡' },
    { href: '/checklist', label: 'Checklist', icon: '✅' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-[#1A1D23] border-b border-neutral-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <span className="text-xl font-bold text-[#E5E7EB] hidden sm:block">
              Portfolio Tracker
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg
                    transition-all duration-200 font-medium
                    ${
                      active
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'text-[#9CA3AF] hover:bg-neutral-700/50 hover:text-[#E5E7EB]'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
