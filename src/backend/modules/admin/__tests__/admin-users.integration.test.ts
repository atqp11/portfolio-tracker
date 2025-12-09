import { createMockProfile } from '@test/helpers/test-utils';
import { adminController } from '@backend/modules/admin/admin.controller';
import { Profile } from '@lib/supabase/db';
import { usersService } from '@backend/modules/admin/service/users.service';

// Define typed mock functions
const mockGetUser = jest.fn() as jest.MockedFunction<
  () => Promise<{ id: string; email: string } | null>
>;

const mockGetUserProfile = jest.fn() as jest.MockedFunction<
  () => Promise<Profile | null>
>;

jest.mock('@lib/auth/session', () => ({
  getUser: () => mockGetUser(),
  getUserProfile: () => mockGetUserProfile(),
  userHasTier: jest.fn().mockResolvedValue(true),
  requireUser: jest.fn(),
  requireUserProfile: jest.fn(),
  requireTier: jest.fn(),
}));
jest.mock('@backend/modules/admin/service/users.service');

const mockFetchAllUsersWithUsage = usersService.fetchAllUsersWithUsage as jest.MockedFunction<
  typeof usersService.fetchAllUsersWithUsage
>;

describe('Admin Users Controller Integration', () => {
  const adminProfile = createMockProfile({
    id: 'admin-1',
    email: 'admin@example.com',
    tier: 'premium',
    is_admin: true,
  });

  const nonAdminProfile = createMockProfile({
    id: 'user-1',
    email: 'user@example.com',
    tier: 'free',
    is_admin: false,
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns users with usage data for admin', async () => {
    const mockUsers = [
      {
        id: 'u1',
        email: 'a@example.com',
        name: 'User A',
        tier: 'free',
        isAdmin: false,
        isActive: true,
        createdAt: '2024-01-01',
        stripeCustomerId: null,
        subscriptionStatus: null,
        usage: {
          daily: { chatQueries: 2, portfolioAnalysis: 0, secFilings: 0 },
          monthly: { chatQueries: 10, portfolioAnalysis: 0, secFilings: 1 },
        },
      },
    ];

    mockFetchAllUsersWithUsage.mockResolvedValue(mockUsers as any);

    const result = await adminController.getAllUsersData();

    expect(result.length).toBe(1);
    expect(result[0].email).toBe('a@example.com');
    expect(result[0].usage).toBeDefined();
  });

  it('returns empty array when no users exist', async () => {
    mockFetchAllUsersWithUsage.mockResolvedValue([]);

    const result = await adminController.getAllUsersData();

    expect(result).toEqual([]);
  });
});
