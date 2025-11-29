// components/AssetCard.tsx
import Link from 'next/link';
import type { ThemeClasses } from '@lib/utils/portfolioTheme';

interface AssetCardProps {
  symbol: string;
  name: string;
  type: string;
  shares: number;
  price: number;
  priceChange: number;
  marketValue: number;
  dayChange: number;
  dayChangePercent: number;
  gainLoss: number;
  gainLossPercent: number;
  onEdit?: () => void;
  theme: ThemeClasses;
}

export default function AssetCard({
  symbol,
  name,
  type,
  shares,
  price,
  priceChange,
  marketValue,
  dayChange,
  dayChangePercent,
  gainLoss,
  gainLossPercent,
  onEdit,
  theme,
}: AssetCardProps) {
  const isUnavailable = price === null || isNaN(price);

  // Helper to display N/A for NaN or null
  const displayValue = (val: number | null | undefined, digits = 2) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `$${val.toFixed(digits)}`;
  };
  const displayPercent = (val: number | null | undefined, digits = 2) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `${val >= 0 ? '+' : ''}${val.toFixed(digits)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0.0001) return 'text-green-600 dark:text-green-400';
    if (value < -0.0001) return 'text-red-600 dark:text-red-400';
    return 'text-gray-900 dark:text-gray-100';
  };

  return (
    <div className={`bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${theme.cardHover} relative`}>
      {/* Edit Button */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-2 right-2 p-2 bg-gray-200 dark:bg-gray-800 hover:bg-blue-600 dark:hover:bg-blue-600 text-gray-600 dark:text-gray-400 hover:text-white rounded-lg transition opacity-0 group-hover:opacity-100"
          title="Edit stock"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {/* Header */}
      <Link href={`/stocks/${symbol}`}>
      <div className="mb-3 cursor-pointer">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-gray-900 dark:text-gray-100 ${theme.groupHoverText} font-bold text-lg`}>{symbol}</span>
          <span className="text-gray-600 dark:text-gray-400 text-sm">({name})</span>
        </div>
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          {type} • {shares} shares
        </div>
      </div>

      {/* Price Row */}
      <div className="flex items-baseline gap-4 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-gray-600 dark:text-gray-400 text-xs block mb-1">Price</span>
          <span className={isUnavailable ? "text-gray-600 dark:text-gray-400 text-base" : "text-gray-900 dark:text-gray-100 text-lg font-medium"}>
            {displayValue(price)}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-gray-600 dark:text-gray-400 text-xs">Δ</span>
          <span className={`text-base font-medium ${getChangeColor(priceChange)}`}>{displayValue(priceChange)}</span>
        </div>
      </div>

      {/* Values */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-sm">Mkt Value</span>
          <span className={isUnavailable ? "text-gray-600 dark:text-gray-400 text-base" : "text-gray-900 dark:text-gray-100 text-base font-medium"}>
            {displayValue(marketValue)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-sm">Day Chg</span>
          <span className={`text-base font-medium ${getChangeColor(dayChange)}`}>{displayValue(dayChange)} ({displayPercent(dayChangePercent)})</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-sm">Gain/Loss</span>
          <span className={`text-base font-medium ${getChangeColor(gainLoss)}`}>{displayValue(gainLoss)} ({displayPercent(gainLossPercent)})</span>
        </div>
      </div>

      {/* View Details Link */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className={`flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 ${theme.groupHoverText}`}>
          <span>View Fundamentals</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      </Link>
    </div>
  );
}
