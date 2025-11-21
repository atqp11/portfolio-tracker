/**
 * News API Data Transfer Objects
 */

export interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsAPIResponse {
  status: string;
  totalResults?: number;
  articles?: NewsArticle[];
  code?: string;
  message?: string;
}

export class NewsAPIError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string
  ) {
    super(message);
    this.name = 'NewsAPIError';
  }
}