/**
 * usePortfolios.ts
 * 
 * This file contains custom React hooks built with `@tanstack/react-query` for managing portfolio-related data.
 * These hooks provide an abstraction over the portfolio API and enable efficient data fetching, caching, and mutation.
 * 
 * Exports:
 * - usePortfolios: Fetches all portfolios and caches the result.
 * - useStocks: Fetches stocks for a specific portfolio by its ID.
 * - useCreatePortfolio: Creates a new portfolio and invalidates the portfolio cache on success.
 * - useUpdatePortfolio: Updates an existing portfolio and invalidates the portfolio cache on success.
 * - useDeletePortfolio: Deletes a portfolio and invalidates the portfolio cache on success.
 * 
 * Usage:
 * Import the required hook(s) and use them in your React components to interact with portfolio data.
 * These hooks leverage React Query's caching and state management capabilities to optimize API interactions.
 * 
 * Example:
 * ```typescript
 * import { usePortfolios, useCreatePortfolio } from '@/hooks/usePortfolios';
 * 
 * function PortfolioList() {
 *   const { data: portfolios, isLoading, error } = usePortfolios();
 *   const createPortfolio = useCreatePortfolio();
 * 
 *   if (isLoading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 * 
 *   const handleCreate = () => {
 *     createPortfolio.mutate({ name: 'New Portfolio', type: 'custom' });
 *   };
 * 
 *   return (
 *     <div>
 *       <ul>
 *         {portfolios?.map((portfolio) => (
 *           <li key={portfolio.id}>{portfolio.name}</li>
 *         ))}
 *       </ul>
 *       <button onClick={handleCreate}>Create Portfolio</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * Notes:
 * - These hooks are designed for frontend integration and rely on the `portfolioService` API.
 * - React Query's `useQuery` and `useMutation` are used for data fetching and mutations.
 * - Cache invalidation ensures that the UI stays in sync with the backend after mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '@/lib/client/api/portfolio-fetcher';
import { Portfolio, Stock } from '@/lib/client/types';

export const usePortfolios = () => {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getPortfolios,
  });
};

export const useStocks = (portfolioId: string) => {
  return useQuery({
    queryKey: ['stocks', portfolioId],
    queryFn: () => portfolioService.getStocks(portfolioId),
    enabled: !!portfolioId, // Only fetch if portfolioId is provided
  });
};

export const useCreatePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: portfolioService.createPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] }); // Refetch portfolios after creation
    },
  });
};

export const useUpdatePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Portfolio> }) =>
      portfolioService.updatePortfolio(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};

export const useDeletePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => portfolioService.deletePortfolio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};