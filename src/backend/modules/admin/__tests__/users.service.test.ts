import { UsersService, usersService } from '@backend/modules/admin/service/users.service';
import { getAllUsers, getCurrentUserUsage } from '@lib/supabase/db';
import { adminUsersResponseSchema } from '@backend/modules/admin/dto/admin.dto';

jest.mock('@lib/supabase/db');

const mockGetAllUsers = getAllUsers as jest.MockedFunction<typeof getAllUsers>;
const mockGetCurrentUserUsage = getCurrentUserUsage as jest.MockedFunction<typeof getCurrentUserUsage>;

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAllUsersWithUsage', () => {
    it('fetches users and maps usage correctly', async () => {
      mockGetAllUsers.mockResolvedValue([
        {
          id: 'u1',
          email: 'a@example.com',
          name: 'User A',
          tier: 'free',
          is_admin: false,
          created_at: '2020-01-01',
          stripe_customer_id: 'cus_123',
          subscription_status: 'active',
        },
      ] as any);

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: { chat_queries: 5, portfolio_analysis: 2, sec_filings: 1 },
        monthly: { chat_queries: 50, portfolio_analysis: 20, sec_filings: 10 },
      } as any);

      const users = await usersService.fetchAllUsersWithUsage();

      // Ensure final API contract validates (camelCase per Zod schema)
      expect(() => adminUsersResponseSchema.parse({ users, total: users.length })).not.toThrow();

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('u1');
      expect(users[0].email).toBe('a@example.com');
      expect(users[0].name).toBe('User A');
      expect(users[0].tier).toBe('free');
      expect(users[0].isAdmin).toBe(false);
      expect(users[0].usage?.daily?.chatQueries).toBe(5);
      expect(users[0].usage?.daily?.portfolioAnalysis).toBe(2);
      expect(users[0].usage?.monthly?.secFilings).toBe(10);
    });

    it('returns empty array when no users exist', async () => {
      mockGetAllUsers.mockResolvedValue([]);

      const users = await usersService.fetchAllUsersWithUsage();

      expect(users).toHaveLength(0);
      expect(mockGetCurrentUserUsage).not.toHaveBeenCalled();
    });

    it('handles users with null/undefined usage data', async () => {
      mockGetAllUsers.mockResolvedValue([
        {
          id: 'u1',
          email: 'nulluser@example.com',
          name: null,
          tier: null,
          is_admin: null,
          created_at: null,
          stripe_customer_id: null,
          subscription_status: null,
        },
      ] as any);

      mockGetCurrentUserUsage.mockResolvedValue(null as any);

      const users = await usersService.fetchAllUsersWithUsage();

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('nulluser@example.com');
      expect(users[0].name).toBeNull();
      expect(users[0].tier).toBeNull();
      expect(users[0].usage?.daily).toBeNull();
      expect(users[0].usage?.monthly).toBeNull();
    });

    it('handles users with partial usage data', async () => {
      mockGetAllUsers.mockResolvedValue([
        { id: 'u1', email: 'partial@example.com' },
      ] as any);

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: { chat_queries: 3 },
        // No monthly data
      } as any);

      const users = await usersService.fetchAllUsersWithUsage();

      expect(users).toHaveLength(1);
      expect(users[0].usage?.daily?.chatQueries).toBe(3);
      expect(users[0].usage?.daily?.portfolioAnalysis).toBeUndefined();
      expect(users[0].usage?.monthly).toBeNull();
    });

    it('fetches usage for each user individually', async () => {
      mockGetAllUsers.mockResolvedValue([
        { id: 'u1', email: 'user1@example.com' },
        { id: 'u2', email: 'user2@example.com' },
        { id: 'u3', email: 'user3@example.com' },
      ] as any);

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: { chat_queries: 1 },
        monthly: { sec_filings: 1 },
      } as any);

      const users = await usersService.fetchAllUsersWithUsage();

      expect(users).toHaveLength(3);
      expect(mockGetCurrentUserUsage).toHaveBeenCalledTimes(3);
      expect(mockGetCurrentUserUsage).toHaveBeenCalledWith('u1');
      expect(mockGetCurrentUserUsage).toHaveBeenCalledWith('u2');
      expect(mockGetCurrentUserUsage).toHaveBeenCalledWith('u3');
    });

    it('preserves all user profile fields', async () => {
      mockGetAllUsers.mockResolvedValue([
        {
          id: 'admin-user',
          email: 'admin@example.com',
          name: 'Admin User',
          tier: 'premium',
          is_admin: true,
          created_at: '2023-06-15T10:30:00Z',
          stripe_customer_id: 'cus_premium123',
          subscription_status: 'active',
        },
      ] as any);

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {},
        monthly: {},
      } as any);

      const users = await usersService.fetchAllUsersWithUsage();

      expect(users[0]).toMatchObject({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        tier: 'premium',
        isAdmin: true,
        createdAt: '2023-06-15T10:30:00Z',
        stripeCustomerId: 'cus_premium123',
        subscriptionStatus: 'active',
      });
    });
  });

  describe('fetchUsersWithPagination', () => {
    beforeEach(() => {
      // Mock createAdminClient
      jest.mock('@lib/supabase/admin', () => ({
        createAdminClient: jest.fn(() => ({
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      }));
    });

    it('should return paginated users with correct metadata', async () => {
      const mockUsers = [
        {
          id: 'u1',
          email: 'user1@example.com',
          name: 'User 1',
          tier: 'free',
          is_admin: false,
          created_at: '2024-01-01',
          stripe_customer_id: null,
          subscription_status: 'active',
        },
        {
          id: 'u2',
          email: 'user2@example.com',
          name: 'User 2',
          tier: 'basic',
          is_admin: false,
          created_at: '2024-01-02',
          stripe_customer_id: 'cus_123',
          subscription_status: 'active',
        },
      ];

      // Mock Supabase admin client
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn((query: string, options?: any) => {
            if (options?.head) {
              // Count query
              return Promise.resolve({ count: 100, error: null });
            }
            // Data query
            return {
              order: jest.fn(() => ({
                range: jest.fn(() => Promise.resolve({
                  data: mockUsers,
                  error: null,
                })),
              })),
            };
          }),
        })),
      };

      jest.doMock('@lib/supabase/admin', () => ({
        createAdminClient: () => mockSupabase,
      }));

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: { chat_queries: 5, portfolio_analysis: 2, sec_filings: 1 },
        monthly: { chat_queries: 50, portfolio_analysis: 20, sec_filings: 10 },
      } as any);

      const result = await usersService.fetchUsersWithPagination(1, 50);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 50,
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });
    });

    it('should calculate pagination metadata correctly', async () => {
      // This is a simpler integration-style test that doesn't mock internals
      // Just verify the structure is correct
      mockGetAllUsers.mockResolvedValue([]);
      mockGetCurrentUserUsage.mockResolvedValue(null as any);

      const result = await usersService.fetchUsersWithPagination(2, 25);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(25);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.users).toBeInstanceOf(Array);
    });
  });
});
