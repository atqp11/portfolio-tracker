// components/PortfolioHeader.tsx
import type { ThemeClasses } from '@lib/utils/portfolioTheme';

interface PortfolioHeaderProps {
  accountValue: number;
  dayChange: number;
  dayChangePercent: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  theme: ThemeClasses;
}

export default function PortfolioHeader({
  accountValue,
  dayChange,
  dayChangePercent,
  unrealizedGainLoss,
  unrealizedGainLossPercent,
  theme,
}: PortfolioHeaderProps) {
  const getChangeColor = (value: number) => {
    if (value > 0.0001) return 'text-[#22C55E]';
    if (value < -0.0001) return 'text-[#EF4444]';
    return 'text-[#E5E7EB]';
  };

  return (
    <div className={`bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 ${theme.containerHover}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Account Value */}
        <div className={theme.groupHoverScale}>
          <div className="text-gray-900 dark:text-gray-100 text-sm mb-1">Account Value</div>
          <div className={`text-gray-600 dark:text-gray-100 text-3xl font-bold ${theme.groupHoverText}`}>
            {accountValue > 0 ? `$${accountValue.toFixed(2)}` : 'No data available'}
          </div>
        </div>

        {/* Day Change */}
        <div className={theme.groupHoverScale}>
          <div className="text-gray-900 dark:text-gray-100 text-sm mb-1">Day Change</div>
          <div className={`text-2xl font-bold ${accountValue > 0 ? getChangeColor(dayChange) : 'text-gray-600 dark:text-gray-100'}`}>
            {accountValue > 0
              ? `${dayChange >= 0 ? '+' : ''}$${dayChange.toFixed(2)} (${dayChangePercent >= 0 ? '+' : ''}${dayChangePercent.toFixed(2)}%)`
              : 'N/A'
            }
          </div>
        </div>

        {/* Unrealized Gain/Loss */}
        <div className={theme.groupHoverScale}>
          <div className="text-gray-900 dark:text-gray-100 text-sm mb-1">Unrealized Gain/Loss</div>
          <div className={`text-2xl font-bold ${accountValue > 0 ? getChangeColor(unrealizedGainLoss) : 'text-gray-600 dark:text-gray-100'}`}>
            {accountValue > 0
              ? `${unrealizedGainLoss >= 0 ? '+' : ''}$${unrealizedGainLoss.toFixed(2)} (${unrealizedGainLossPercent >= 0 ? '+' : ''}${unrealizedGainLossPercent.toFixed(2)}%)`
              : 'N/A'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
