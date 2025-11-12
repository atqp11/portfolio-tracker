// app/layout.tsx
import type { Metadata } from 'next';
import './global.css';

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
      <body className="font-sans">{children}</body>
    </html>
  );
}