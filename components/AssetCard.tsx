// components/AssetCard.tsx
import Link from 'next/link';

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
}: AssetCardProps) {
  const isUnavailable = !price || isNaN(price);

  const getChangeColor = (value: number) => {
    if (value > 0.0001) return 'text-green-600 dark:text-green-400';
    if (value < -0.0001) return 'text-red-600 dark:text-red-400';
    return 'text-gray-900 dark:text-gray-100';
  };

  return (
    <Link href={`/stocks/${symbol}`}>
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-200 cursor-pointer group">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-bold text-lg transition-colors">{symbol}</span>
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
          {isUnavailable ? (
            <span className="text-gray-600 dark:text-gray-400 text-base">N/A</span>
          ) : (
            <span className="text-gray-900 dark:text-gray-100 text-lg font-medium">
              ${price.toFixed(2)}
            </span>
          )}
        </div>
        {!isUnavailable && (
          <div className="flex items-baseline gap-1">
            <span className="text-gray-600 dark:text-gray-400 text-xs">Δ</span>
            <span className={`text-base font-medium ${getChangeColor(priceChange)}`}>
              {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Values */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-sm">Mkt Value</span>
          {isUnavailable ? (
            <span className="text-gray-600 dark:text-gray-400 text-base">N/A</span>
          ) : (
            <span className="text-gray-900 dark:text-gray-100 text-base font-medium">
              ${marketValue.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-sm">Day Chg</span>
          {isUnavailable ? (
            <span className="text-gray-600 dark:text-gray-400 text-base">N/A</span>
          ) : (
            <span className={`text-base font-medium ${getChangeColor(dayChange)}`}>
              {dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} ({dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%)
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 text-sm">Gain/Loss</span>
          {isUnavailable || isNaN(gainLoss) ? (
            <span className="text-gray-600 dark:text-gray-400 text-base">N/A</span>
          ) : (
            <span className={`text-base font-medium ${getChangeColor(gainLoss)}`}>
              {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
            </span>
          )}
        </div>
      </div>

        {/* View Details Link */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <span>View Fundamentals</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
