/**
 * Utility functions for the application
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * Commonly used for conditional Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Re-export specific utilities (avoiding conflicts)
export * from './aiCache';
export * from './apiErrorClassifier';
export * from './apiRateLimitTracker';
export * from './localStorageCache';
export * from './portfolioTheme';
export * from './priceUpdater';
// serverCache has conflicting exports with localStorageCache, import directly when needed
