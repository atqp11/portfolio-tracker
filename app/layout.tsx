// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './global.css';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}