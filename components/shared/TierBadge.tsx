/**
 * Tier Badge Component
 *
 * Displays user's subscription tier with visual styling
 * Supports three tiers: free, basic, premium
 */

import Link from 'next/link';
import { type TierName } from '@lib/tiers';

interface TierBadgeProps {
  tier: TierName;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  clickable?: boolean;
  className?: string;
}

const tierConfig = {
  free: {
    label: 'Free',
    color: 'bg-gray-500 text-white',
    icon: '🆓',
  },
  basic: {
    label: 'Basic',
    color: 'bg-blue-500 text-white',
    icon: '⭐',
  },
  premium: {
    label: 'Premium',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    icon: '👑',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function TierBadge({
  tier,
  size = 'md',
  showIcon = true,
  clickable = true,
  className = '',
}: TierBadgeProps) {
  const config = tierConfig[tier] || tierConfig.free;
  const sizeClass = sizeClasses[size];

  const badgeContent = (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${config.color} ${sizeClass}
        ${clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
        ${className}
      `}
      title={clickable ? 'View usage & quotas' : `${config.label} Tier`}
    >
      {showIcon && <span className="text-sm">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );

  if (clickable) {
    return (
      <Link href="/usage" className="inline-block">
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
}
