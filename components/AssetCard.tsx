// components/AssetCard.tsx
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
    if (value > 0.0001) return 'text-[#22C55E]';
    if (value < -0.0001) return 'text-[#EF4444]';
    return 'text-[#E5E7EB]';
  };

  return (
    <div className="bg-[#0E1114] p-4 rounded-lg border border-neutral-800">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[#E5E7EB] font-bold text-lg">{symbol}</span>
          <span className="text-[#9CA3AF] text-sm">({name})</span>
        </div>
        <div className="text-[#9CA3AF] text-sm">
          {type} • {shares} shares
        </div>
      </div>

      {/* Price Row */}
      <div className="flex items-baseline gap-4 mb-3 pb-3 border-b border-neutral-800">
        <div>
          <span className="text-[#9CA3AF] text-xs block mb-1">Price</span>
          {isUnavailable ? (
            <span className="text-[#9CA3AF] text-base">N/A</span>
          ) : (
            <span className="text-[#E5E7EB] text-lg font-medium">
              ${price.toFixed(2)}
            </span>
          )}
        </div>
        {!isUnavailable && (
          <div className="flex items-baseline gap-1">
            <span className="text-[#9CA3AF] text-xs">Δ</span>
            <span className={`text-base font-medium ${getChangeColor(priceChange)}`}>
              {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Values */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[#9CA3AF] text-sm">Mkt Value</span>
          {isUnavailable ? (
            <span className="text-[#9CA3AF] text-base">N/A</span>
          ) : (
            <span className="text-[#E5E7EB] text-base font-medium">
              ${marketValue.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#9CA3AF] text-sm">Day Chg</span>
          {isUnavailable ? (
            <span className="text-[#9CA3AF] text-base">N/A</span>
          ) : (
            <span className={`text-base font-medium ${getChangeColor(dayChange)}`}>
              {dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} ({dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%)
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#9CA3AF] text-sm">Gain/Loss</span>
          {isUnavailable || isNaN(gainLoss) ? (
            <span className="text-[#9CA3AF] text-base">N/A</span>
          ) : (
            <span className={`text-base font-medium ${getChangeColor(gainLoss)}`}>
              {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
