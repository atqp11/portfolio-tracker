// Hoist mocks before imports
jest.mock('@lib/auth/session');
jest.mock('@backend/modules/portfolio/repository/portfolio.repository');
jest.mock('@backend/modules/stocks/repository/stock.repository');
jest.mock('@backend/modules/portfolio/service/portfolio.service');
jest.mock('@backend/modules/stocks/service/stock.service');

import { createMockRequest, extractJSON, mockUserSession } from '../helpers/test-utils';
import * as authSession from '@lib/auth/session';
import { portfolioRepository } from '@backend/modules/portfolio/repository/portfolio.repository';
import { stockRepository } from '@backend/modules/stocks/repository/stock.repository';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import { stockService } from '@backend/modules/stocks/service/stock.service';
import { getTierConfig } from '@lib/tiers';

let POST_Portfolio: any;
let POST_Stock: any;

describe('Quota Middleware', () => {
    beforeAll(async () => {
        const portfolioRoute = await import('@app/api/portfolio/route');
        POST_Portfolio = portfolioRoute.POST;
        const stockRoute = await import('@app/api/stocks/route');
        POST_Stock = stockRoute.POST;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('withPortfolioQuota', () => {
        it('should allow creating a portfolio if under the limit', async () => {
            const mockUser = mockUserSession({
                id: 'user-123',
                email: 'test@example.com',
                tier: 'free',
            });
            
            const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
            
            (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
            (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
            (portfolioRepository.findAll as jest.Mock).mockResolvedValue([]);
            (portfolioService.create as jest.Mock).mockResolvedValue({
                id: 'port-1',
                name: 'Test Portfolio',
                type: 'Investment',
                initialValue: 1000,
            });

            const request = createMockRequest({
                method: 'POST',
                body: { name: 'Test Portfolio', type: 'Investment', initialValue: 1000 },
            });
            const response = await POST_Portfolio(request);
            expect(response.status).not.toBe(429);
        });

        it('should block creating a portfolio if at the limit', async () => {
            const mockUser = mockUserSession({
                id: 'user-123',
                email: 'test@example.com',
                tier: 'free',
            });
            const tierConfig = getTierConfig('free');
            
            const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
            
            (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
            (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
            (portfolioRepository.findAll as jest.Mock).mockResolvedValue(
                new Array(tierConfig.maxPortfolios).fill({})
            );

            const request = createMockRequest({
                method: 'POST',
                body: { name: 'Test Portfolio', type: 'Investment', initialValue: 1000 },
            });
            const response = await POST_Portfolio(request);
            const data = await extractJSON(response);

            expect(response.status).toBe(429);
            expect(data.error.message).toContain('You have reached the limit');
        });
    });

    describe('withStockQuota', () => {
        it('should allow creating a stock if under the limit', async () => {
            const mockUser = mockUserSession({
                id: 'user-123',
                email: 'test@example.com',
                tier: 'free',
            });
            
            const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
            
            (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
            (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
            (stockRepository.findByPortfolioId as jest.Mock).mockResolvedValue([]);
            (stockService.create as jest.Mock).mockResolvedValue({
                id: 'stock-1',
                portfolioId: 'port-123',
                symbol: 'AAPL',
                name: 'Apple Inc.',
                shares: 10,
                avgPrice: 150,
            });

            const request = createMockRequest({
                method: 'POST',
                body: { portfolioId: 'port-123', symbol: 'AAPL', name: 'Apple Inc.', shares: 10, avgPrice: 150 },
            });
            const response = await POST_Stock(request);
            expect(response.status).not.toBe(429);
        });

        it('should block creating a stock if at the limit', async () => {
            const mockUser = mockUserSession({
                id: 'user-123',
                email: 'test@example.com',
                tier: 'free',
            });
            const tierConfig = getTierConfig('free');
            
            const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
            
            (authSession.getUser as jest.Mock).mockResolvedValue(mockAuthUser);
            (authSession.getUserProfile as jest.Mock).mockResolvedValue(mockUser.profile);
            (stockRepository.findByPortfolioId as jest.Mock).mockResolvedValue(
                new Array(tierConfig.maxStocksPerPortfolio).fill({})
            );

            const request = createMockRequest({
                method: 'POST',
                body: { portfolioId: 'port-123', symbol: 'AAPL', name: 'Apple Inc.', shares: 10, avgPrice: 150 },
            });
            const response = await POST_Stock(request);
            const data = await extractJSON(response);

            expect(response.status).toBe(429);
            expect(data.error.message).toContain('You have reached the limit');
        });
    });
});
