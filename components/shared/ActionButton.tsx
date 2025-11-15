/**
 * ActionButton - Styled button with urgency-based colors and optional animation
 * Extracted from StrategyAccordion for reuse across thesis and checklist components
 */

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  urgency?: 'green' | 'yellow' | 'red' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ActionButton({
  onClick,
  children,
  urgency = 'neutral',
  size = 'md',
  animated = false,
  disabled = false,
  className = '',
}: ActionButtonProps) {
  const getUrgencyClasses = () => {
    switch (urgency) {
      case 'red':
        return 'bg-red-600 hover:bg-red-700 border-red-400 hover:shadow-red-500/50';
      case 'yellow':
        return 'bg-yellow-600 hover:bg-yellow-700 border-yellow-400 hover:shadow-yellow-500/50';
      case 'green':
        return 'bg-green-600 hover:bg-green-700 border-green-400 hover:shadow-green-500/50';
      case 'neutral':
      default:
        return 'bg-neutral-600 hover:bg-neutral-700 border-neutral-500 hover:shadow-neutral-500/50';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-3 py-1.5';
      case 'md':
        return 'text-sm px-4 py-2';
      case 'lg':
        return 'text-base px-5 py-2.5';
    }
  };

  const animationClasses = animated && urgency === 'red' 
    ? 'animate-pulse hover:animate-none' 
    : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        text-white font-bold rounded-lg shadow-lg 
        transition-all border-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getUrgencyClasses()} 
        ${getSizeClasses()} 
        ${animationClasses}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
