import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '@/client/services/portfolioService';
import { Portfolio, Stock } from '@/client/types';

export const usePortfolios = () => {
  return useQuery<Portfolio[]>(['portfolios'], portfolioService.getPortfolios);
};

export const useStocks = (portfolioId: string) => {
  return useQuery<Stock[]>(['stocks', portfolioId], () => portfolioService.getStocks(portfolioId), {
    enabled: !!portfolioId, // Only fetch if portfolioId is provided
  });
};

export const useCreatePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation(portfolioService.createPortfolio, {
    onSuccess: () => {
      queryClient.invalidateQueries(['portfolios']); // Refetch portfolios after creation
    },
  });
};

export const useUpdatePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation(({ id, updates }: { id: string; updates: Partial<Portfolio> }) =>
    portfolioService.updatePortfolio(id, updates), {
    onSuccess: () => {
      queryClient.invalidateQueries(['portfolios']);
    },
  });
};

export const useDeletePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => portfolioService.deletePortfolio(id), {
    onSuccess: () => {
      queryClient.invalidateQueries(['portfolios']);
    },
  });
};