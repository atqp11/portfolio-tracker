// app/layout.tsx - GLOBAL Layout (Required: HTML/Body tags, Context Providers)

import type { Metadata } from 'next';
import './global.css';
import QueryProvider from '@/components/QueryProvider';
import { ThemeProvider } from '@/lib/contexts/ThemeContext'; // Use custom ThemeProvider

export const metadata: Metadata = {
  title: 'Live Portfolio Tracker',
  description: 'Energy & Copper portfolios with live prices, news, charts & alerts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider> {/* Use custom ThemeProvider */}
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}