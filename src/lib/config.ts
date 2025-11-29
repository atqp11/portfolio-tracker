/**
 * The `config.ts` file contains hardcoded configuration values for development purposes.
 * These configurations define portfolio setups, including initial cash, margin, stock allocations,
 * and commodity tracking. This file is likely intended for testing and should be revisited
 * for production use to ensure dynamic and secure configuration management.
 *
 * Key Components:
 *
 * 1. **Portfolio Configurations:**
 *    - Each portfolio configuration includes:
 *      - `id`: Unique identifier for the portfolio.
 *      - `name`: Name of the portfolio.
 *      - `initialCash`: Starting cash balance.
 *      - `initialMargin`: Starting margin balance.
 *      - `initialValue`: Total initial portfolio value.
 *      - `cashRatio`: Ratio of cash allocation.
 *      - `marginRatio`: Ratio of margin allocation.
 *      - `stopLossValue`: Value at which stop-loss is triggered.
 *      - `takeProfitValue`: Value at which take-profit is triggered.
 *      - `enableDRIP`: Whether Dividend Reinvestment Plan (DRIP) is enabled.
 *      - `stocks`: Array of stock allocations, each with:
 *        - `symbol`: Stock ticker symbol.
 *        - `name`: Stock name.
 *        - `cashAllocation`: Amount of cash allocated to the stock.
 *        - `useMargin`: Whether margin is used for the stock.
 *      - `commodities`: Array of commodities tracked, each with:
 *        - `symbol`: Commodity ticker symbol.
 *        - `name`: Commodity name.
 *        - `unit`: Unit of measurement for the commodity.
 *
 * 2. **Development Note:**
 *    - These values are hardcoded and should be replaced with dynamic configurations
 *      for production environments. Consider using environment variables, a database,
 *      or a configuration management system.
 *
 * 3. **Usage in Thesis and Checklist Functionality:**
 *    - The hardcoded configurations are used in the thesis and checklist functionality.
 *    - The checklist is specifically tailored for the two predefined portfolios (`energy` and `copper`).
 *    - This tight coupling to specific portfolios should be revisited to allow dynamic portfolio management.
 *
 * Usage:
 * - The `configs` array can be used to simulate portfolio setups for testing purposes.
 * - Each portfolio includes predefined stock and commodity allocations, making it
 *   suitable for development and debugging scenarios.
 *
 * This file is critical for testing portfolio-related features but should not be
 * relied upon in production without proper validation and security measures.
 */

// lib/config.ts
export const configs = [
  {
    id: 'energy',
    name: 'Energy Portfolio',
    initialCash: 14000,
    initialMargin: 6000,
    initialValue: 20000,
    cashRatio: 0.7,
    marginRatio: 0.3,
    stopLossValue: 14000,
    takeProfitValue: 30000,
    enableDRIP: true,
    stocks: [
      { symbol: 'CNQ', name: 'Canadian Natural', cashAllocation: 3500, useMargin: true },
      { symbol: 'SU', name: 'Suncor', cashAllocation: 3500, useMargin: true },
      { symbol: 'TRMLF', name: 'Tourmaline', cashAllocation: 2800, useMargin: true },
      { symbol: 'AETUF', name: 'ARC Resources', cashAllocation: 2100, useMargin: true },
      { symbol: 'TRP', name: 'TC Energy', cashAllocation: 2100, useMargin: true },
    ],
    commodities: [
      { symbol: 'CL=F', name: 'WTI Crude Oil', unit: 'per bbl' },
      { symbol: 'NG=F', name: 'Henry Hub Natural Gas', unit: 'per MMBtu' },
    ],
  },
  {
    id: 'copper',
    name: 'Copper Portfolio',
    initialCash: 7000,
    initialMargin: 3000,
    initialValue: 10000,
    cashRatio: 0.7,
    marginRatio: 0.3,
    stopLossValue: 7000,
    takeProfitValue: 15000,
    enableDRIP: true,
    stocks: [
      { symbol: 'FCX', name: 'Freeport-McMoRan', cashAllocation: 2800, useMargin: true },
      { symbol: 'COPX', name: 'Global X Copper Miners ETF', cashAllocation: 2100, useMargin: true },
      { symbol: 'ERO', name: 'Ero Copper', cashAllocation: 1050, useMargin: true },
      { symbol: 'HBM', name: 'Hudbay Minerals', cashAllocation: 1050, useMargin: true },
    ],
    commodities: [ { symbol: 'HG=F', name: 'Copper', unit: 'per lb' } ],
  },
] as const;