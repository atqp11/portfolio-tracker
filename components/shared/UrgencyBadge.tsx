/**
 * UrgencyBadge - Displays color-coded urgency indicator
 * Extracted from StrategyAccordion for reuse across thesis and checklist components
 */

interface UrgencyBadgeProps {
  urgency: 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline';
  className?: string;
}

export default function UrgencyBadge({ 
  urgency, 
  size = 'md', 
  variant = 'solid',
  className = '' 
}: UrgencyBadgeProps) {
  const getColorClasses = () => {
    if (variant === 'outline') {
      switch (urgency) {
        case 'green':
          return 'bg-green-900/30 border-green-500/50 text-green-300';
        case 'yellow':
          return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300';
        case 'red':
          return 'bg-red-900/30 border-red-500/50 text-red-300';
      }
    } else {
      switch (urgency) {
        case 'green':
          return 'bg-green-500/20 text-green-400 border-green-500/50';
        case 'yellow':
          return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case 'red':
          return 'bg-red-500/20 text-red-400 border-red-500/50';
      }
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'md':
        return 'text-sm px-3 py-1';
      case 'lg':
        return 'text-base px-4 py-1.5';
    }
  };

  const getLabel = () => {
    switch (urgency) {
      case 'green':
        return '✓ Low';
      case 'yellow':
        return '⚠️ Medium';
      case 'red':
        return '🚨 High';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium uppercase tracking-wide ${getColorClasses()} ${getSizeClasses()} ${className}`}
    >
      {getLabel()}
    </span>
  );
}
