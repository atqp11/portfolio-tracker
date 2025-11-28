/**
 * portfolio-fetcher.ts
 * 
 * This file provides a service for interacting with the portfolio-related API endpoints.
 * It defines methods to fetch, create, update, and delete portfolios and their associated stocks.
 * 
 * Exports:
 * - portfolioService: An object containing methods to interact with the portfolio API.
 * 
 * API Methods:
 * - getPortfolios(): Fetches all portfolios from the API.
 * - getStocks(portfolioId: string): Fetches stocks for a specific portfolio by its ID.
 * - createPortfolio(portfolioData: Partial<Portfolio>): Creates a new portfolio with the provided data.
 * - updatePortfolio(id: string, updates: Partial<Portfolio>): Updates an existing portfolio with the given ID and updates.
 * - deletePortfolio(id: string): Deletes a portfolio by its ID.
 * 
 * Usage:
 * Import the `portfolioService` object and call its methods to interact with the portfolio API.
 * Each method returns a Promise and may throw an error if the API request fails.
 * 
 * Example:
 * ```typescript
 * import { portfolioService } from '@/lib/client/api/portfolio-fetcher';
 * 
 * async function fetchPortfolios() {
 *   try {
 *     const portfolios = await portfolioService.getPortfolios();
 *     console.log(portfolios);
 *   } catch (error) {
 *     console.error('Error fetching portfolios:', error);
 *   }
 * }
 * ```
 * 
 * Note: This service is responsible for fetching data from the backend API to be used in frontend pages.
 */

import { Portfolio, Stock } from '@/lib/client/types';

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