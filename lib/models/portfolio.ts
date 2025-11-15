// Portfolio data models - compatible with existing config.ts

export interface Portfolio {
  id: string;
  name: string;
  type: 'energy' | 'copper';
  
  // Financial config (from existing config)
  initialCash: number;
  initialMargin: number;
  initialValue: number;
  cashRatio: number;
  marginRatio: number;
  stopLossValue: number;
  takeProfitValue: number;
  enableDRIP: boolean;
  
  // Holdings
  holdings: Holding[];
  
  // Commodities
  commodities?: Commodity[];
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Holding {
  id?: string;
  portfolioId?: string;
  
  // Stock info (from existing config)
  symbol: string;
  name: string;
  cashAllocation: number;
  useMargin: boolean;
  
  // Position data (calculated)
  shares?: number;
  entryPrice?: number;
  currentPrice?: number;
  previousPrice?: number;
  actualValue?: number;
  cashUsed?: number;
  marginUsed?: number;
  entryDate?: Date;
  
  // Links to other entities
  thesisId?: string;
}

export interface Commodity {
  symbol: string;
  name: string;
  unit: string;
}

/**
 * Helper to convert existing config to Portfolio type
 * This allows gradual migration from hardcoded config to database
 */
export function configToPortfolio(config: any): Portfolio {
  return {
    id: config.id,
    name: config.name,
    type: config.id as 'energy' | 'copper',
    initialCash: config.initialCash,
    initialMargin: config.initialMargin,
    initialValue: config.initialValue,
    cashRatio: config.cashRatio,
    marginRatio: config.marginRatio,
    stopLossValue: config.stopLossValue,
    takeProfitValue: config.takeProfitValue,
    enableDRIP: config.enableDRIP,
    holdings: config.stocks.map((stock: any) => ({
      symbol: stock.symbol,
      name: stock.name,
      cashAllocation: stock.cashAllocation,
      useMargin: stock.useMargin,
    })),
    commodities: config.commodities || [],
  };
}
