'use client';

import { cn } from '@/src/lib/utils';

interface BillingToggleProps {
  value: 'monthly' | 'annual';
  onChange: (value: 'monthly' | 'annual') => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center bg-gray-800 rounded-full p-1">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-semibold transition-all',
          value === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('annual')}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-semibold transition-all',
          value === 'annual' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
        )}
      >
        Annual
      </button>
    </div>
  );
}
