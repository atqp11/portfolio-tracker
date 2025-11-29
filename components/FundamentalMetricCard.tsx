// components/FundamentalMetricCard.tsx
'use client';

import { ValuationIndicator } from '@lib/calculator';

interface FundamentalMetricCardProps {
  name: string;
  value: number | null;
  unit?: string;
  indicator?: ValuationIndicator | null;
  comparison?: {
    fiveYearAvg?: number;
    sectorAvg?: number;
    spyAvg?: number;
  };
  description?: string;
  sparklineData?: number[];
}

export default function FundamentalMetricCard({
  name,
  value,
  unit = '',
  indicator,
  comparison,
  description,
  sparklineData,
}: FundamentalMetricCardProps) {
  const formatValue = (val: number | null): string => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val !== 'number' || isNaN(val)) return 'N/A';
    
    // Format based on value magnitude
    if (Math.abs(val) >= 1000) {
      return val.toFixed(0);
    } else if (Math.abs(val) >= 10) {
      return val.toFixed(1);
    } else {
      return val.toFixed(2);
    }
  };

  const getIndicatorStyles = (ind: ValuationIndicator | null | undefined) => {
    if (!ind) return { emoji: '', color: '', bgColor: '', label: '' };
    
    switch (ind) {
      case 'undervalued':
        return {
          emoji: '✅',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          label: 'Undervalued',
        };
      case 'fair':
        return {
          emoji: '⚠️',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          label: 'Fair Value',
        };
      case 'overvalued':
        return {
          emoji: '🔴',
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          label: 'Overvalued',
        };
    }
  };

  const indicatorStyle = getIndicatorStyles(indicator);

  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-4 hover:border-[#3B82F6] hover:shadow-lg hover:shadow-[#3B82F6]/10 transition-all duration-200 group cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">{name}</h3>
          {description && (
            <button
              className="text-[#71717A] hover:text-[#3B82F6] transition-colors"
              title={description}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
        </div>
        
        {indicator && (
          <span
            className={`text-xs px-2 py-1 rounded ${indicatorStyle.bgColor} ${indicatorStyle.color} font-medium`}
          >
            {indicatorStyle.emoji} {indicatorStyle.label}
          </span>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-3">
        <div className="text-3xl font-bold text-[#FAFAFA] group-hover:text-[#3B82F6] transition-colors">
          {formatValue(value)}
          {unit && <span className="text-xl ml-1">{unit}</span>}
        </div>
      </div>

      {/* Comparison Bar */}
      {value !== null && comparison && (
        <div className="space-y-2">
          {comparison.fiveYearAvg !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#71717A]">5Y Avg</span>
              <span className={value < comparison.fiveYearAvg ? 'text-green-400' : 'text-[#A1A1AA]'}>
                {formatValue(comparison.fiveYearAvg)}{unit}
              </span>
            </div>
          )}
          {comparison.sectorAvg !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#71717A]">Sector</span>
              <span className={value < comparison.sectorAvg ? 'text-green-400' : 'text-[#A1A1AA]'}>
                {formatValue(comparison.sectorAvg)}{unit}
              </span>
            </div>
          )}
          {comparison.spyAvg !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#71717A]">S&P 500</span>
              <span className={value < comparison.spyAvg ? 'text-green-400' : 'text-[#A1A1AA]'}>
                {formatValue(comparison.spyAvg)}{unit}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sparkline (if provided) */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1A1A1A]">
          <div className="h-8 flex items-end gap-0.5">
            {sparklineData.map((val, idx) => {
              const max = Math.max(...sparklineData);
              const min = Math.min(...sparklineData);
              const range = max - min;
              const height = range > 0 ? ((val - min) / range) * 100 : 50;
              
              return (
                <div
                  key={idx}
                  className="flex-1 bg-[#3B82F6] opacity-60 hover:opacity-100 hover:bg-[#60A5FA] transition-all duration-150 rounded-t cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`${formatValue(val)}${unit}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* N/A State */}
      {value === null && (
        <div className="text-sm text-[#71717A] italic">
          Data not available
        </div>
      )}
    </div>
  );
}
