// components/PortfolioHeader.tsx
interface PortfolioHeaderProps {
  accountValue: number;
  dayChange: number;
  dayChangePercent: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
}

export default function PortfolioHeader({
  accountValue,
  dayChange,
  dayChangePercent,
  unrealizedGainLoss,
  unrealizedGainLossPercent,
}: PortfolioHeaderProps) {
  const getChangeColor = (value: number) => {
    if (value > 0.0001) return 'text-[#22C55E]';
    if (value < -0.0001) return 'text-[#EF4444]';
    return 'text-[#E5E7EB]';
  };

  return (
    <div className="bg-[#0E1114] p-6 rounded-lg border border-neutral-800 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Account Value */}
        <div>
          <div className="text-[#9CA3AF] text-sm mb-1">Account Value</div>
          <div className="text-[#E5E7EB] text-3xl font-bold">
            ${accountValue.toFixed(2)}
          </div>
        </div>

        {/* Day Change */}
        <div>
          <div className="text-[#9CA3AF] text-sm mb-1">Day Change</div>
          <div className={`text-2xl font-bold ${getChangeColor(dayChange)}`}>
            {dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} ({dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%)
          </div>
        </div>

        {/* Unrealized Gain/Loss */}
        <div>
          <div className="text-[#9CA3AF] text-sm mb-1">Unrealized Gain/Loss</div>
          <div className={`text-2xl font-bold ${getChangeColor(unrealizedGainLoss)}`}>
            {unrealizedGainLoss >= 0 ? '+' : ''}${unrealizedGainLoss.toFixed(2)} ({unrealizedGainLossPercent >= 0 ? '+' : ''}{unrealizedGainLossPercent.toFixed(2)}%)
          </div>
        </div>
      </div>
    </div>
  );
}
