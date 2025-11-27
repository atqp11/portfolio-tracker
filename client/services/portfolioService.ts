import { Portfolio, Stock } from '@/client/types';

const API_BASE_URL = '/api';

export const portfolioService = {
  async getPortfolios(): Promise<Portfolio[]> {
    const response = await fetch(`${API_BASE_URL}/portfolio`);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolios');
    }
    return response.json();
  },

  async getStocks(portfolioId: string): Promise<Stock[]> {
    const response = await fetch(`${API_BASE_URL}/stocks?portfolioId=${portfolioId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stocks');
    }
    return response.json();
  },

  async createPortfolio(portfolioData: Partial<Portfolio>): Promise<Portfolio> {
    const response = await fetch(`${API_BASE_URL}/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolioData),
    });
    if (!response.ok) {
      throw new Error('Failed to create portfolio');
    }
    return response.json();
  },

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/portfolio?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update portfolio');
    }
  },

  async deletePortfolio(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/portfolio?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete portfolio');
    }
  },
};