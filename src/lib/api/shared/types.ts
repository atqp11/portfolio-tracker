// lib/api/shared/types.ts
export interface Commodity {
  price: number;
  timestamp: string;
  name?: string;
}

export interface NewsItem {
  title: string;
  description: string;
  source: string;
  url: string;
  date: string;
}