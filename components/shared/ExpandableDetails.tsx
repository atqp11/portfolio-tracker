/**
 * ExpandableDetails - Collapsible content section with animated chevron
 * Extracted from StrategyAccordion for reuse across thesis and checklist components
 */

import { ReactNode } from 'react';

interface ExpandableDetailsProps {
  summary: string | ReactNode;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
}

export default function ExpandableDetails({
  summary,
  children,
  className = '',
  summaryClassName = '',
  contentClassName = '',
}: ExpandableDetailsProps) {
  return (
    <details className={`group ${className}`}>
      <summary
        className={`cursor-pointer hover:text-[#E5E7EB] list-none flex items-center gap-1 ${summaryClassName}`}
      >
        <svg
          className="w-4 h-4 group-open:rotate-90 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span>{summary}</span>
      </summary>
      <div className={`mt-2 ml-5 ${contentClassName}`}>{children}</div>
    </details>
  );
}
