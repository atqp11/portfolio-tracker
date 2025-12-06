import { NextRequest } from 'next/server';
import { extractJSON, createMockProfile } from '@test/helpers/test-utils';
import { GET } from '@app/api/admin/users/route';
import { getAllUsers, getCurrentUserUsage, Profile } from '@lib/supabase/db';

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
jest.mock('@lib/supabase/db');

const mockGetAllUsers = getAllUsers as jest.MockedFunction<typeof getAllUsers>;
const mockGetCurrentUserUsage = getCurrentUserUsage as jest.MockedFunction<typeof getCurrentUserUsage>;

describe('Admin Users Route', () => {
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

  it('returns users for admin', async () => {
    mockGetUser.mockResolvedValue({ id: adminProfile.id, email: adminProfile.email });
    mockGetUserProfile.mockResolvedValue(adminProfile);
    mockGetAllUsers.mockResolvedValue([{ id: 'u1', email: 'a@example.com' }] as any);
    mockGetCurrentUserUsage.mockResolvedValue({ daily: { chat_queries: 2 }, monthly: { sec_filings: 1 } } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users', { method: 'GET' });
    const res = await GET(req);
    const data = await extractJSON(res as any);

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.users.length).toBe(1);
    expect(data.data.users[0].email).toBe('a@example.com');
  });

  it('returns auth error when not admin', async () => {
    mockGetUser.mockResolvedValue({ id: nonAdminProfile.id, email: nonAdminProfile.email });
    mockGetUserProfile.mockResolvedValue(nonAdminProfile);

    const req = new NextRequest('http://localhost:3000/api/admin/users', { method: 'GET' });
    const res = await GET(req);
    const data = await extractJSON(res as any);

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
