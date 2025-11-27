import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '@/client/services/portfolioService';
import { Portfolio, Stock } from '@/client/types';

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