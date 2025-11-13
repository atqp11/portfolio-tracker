'use client';

import StonksAI from '@/components/StonksAI/StonksAI';

export default function TestAIPage() {
  // Test with a few sample tickers from the portfolio
  const testTickers = ['CNQ', 'SU', 'TRP'];

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <StonksAI tickers={testTickers} />
    </div>
  );
}
