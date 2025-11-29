// lib/utils/portfolioTheme.ts

export interface ThemeClasses {
  // For main containers (PortfolioHeader, Summary section)
  containerHover: string;
  // For asset/stock cards
  cardHover: string;
  // For small metric cards inside panels
  metricCardHover: string;
  // For text that changes color on group hover
  groupHoverText: string;
  // For elements that scale on group hover
  groupHoverScale: string;
}

const colorThemes: ThemeClasses[] = [
  // Blue theme
  {
    containerHover: 'transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-blue-400 hover:shadow-md hover:shadow-blue-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Purple theme
  {
    containerHover: 'transition-all duration-200 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-purple-400 hover:shadow-md hover:shadow-purple-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Emerald theme
  {
    containerHover: 'transition-all duration-200 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Orange theme
  {
    containerHover: 'transition-all duration-200 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-orange-400 hover:shadow-md hover:shadow-orange-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Pink theme
  {
    containerHover: 'transition-all duration-200 hover:border-pink-500 dark:hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-pink-500 dark:hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-pink-400 hover:shadow-md hover:shadow-pink-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Teal theme
  {
    containerHover: 'transition-all duration-200 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-teal-400 hover:shadow-md hover:shadow-teal-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Indigo theme
  {
    containerHover: 'transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
  // Rose theme
  {
    containerHover: 'transition-all duration-200 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/20 hover:scale-[1.005] group',
    cardHover: 'transition-all duration-200 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/20 hover:scale-[1.01] cursor-pointer group',
    metricCardHover: 'transition-all duration-150 hover:border-rose-400 hover:shadow-md hover:shadow-rose-400/10 hover:scale-[1.02]',
    groupHoverText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors',
    groupHoverScale: 'transition-all duration-200 group-hover:scale-105',
  },
];

/**
 * Get a consistent color theme for a portfolio based on its position in the list
 * @param portfolioId - The portfolio ID
 * @param allPortfolioIds - Array of all portfolio IDs in order
 * @returns Theme classes object with complete Tailwind class strings
 */
export function getPortfolioTheme(portfolioId: string, allPortfolioIds: string[]): ThemeClasses {
  const index = allPortfolioIds.indexOf(portfolioId);
  const themeIndex = index >= 0 ? index % colorThemes.length : 0;
  return colorThemes[themeIndex];
}
