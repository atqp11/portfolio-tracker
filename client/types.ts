// Define client-side types for portfolios and stocks

export interface Portfolio {
  id: string;
  name: string;
  targetValue: number;
  borrowedAmount: number;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number | null;
  previousPrice: number | null;
  actualValue: number | null;
}