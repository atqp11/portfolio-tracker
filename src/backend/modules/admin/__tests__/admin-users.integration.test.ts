import { NextRequest } from 'next/server';
import { extractJSON } from '@test/helpers/test-utils';
import { GET } from '@app/api/admin/users/route';
import { requireAdmin } from '@lib/auth/admin';
import { NextResponse } from 'next/server';
import { getAllUsers, getCurrentUserUsage } from '@lib/supabase/db';
import { ErrorResponse } from '@lib/types/base/response.dto';

jest.mock('@lib/auth/admin');
jest.mock('@lib/supabase/db');

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockGetAllUsers = getAllUsers as jest.MockedFunction<typeof getAllUsers>;
const mockGetCurrentUserUsage = getCurrentUserUsage as jest.MockedFunction<typeof getCurrentUserUsage>;

describe('Admin Users Route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns users for admin', async () => {
    mockRequireAdmin.mockResolvedValue(null as any);
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
    mockRequireAdmin.mockResolvedValue(NextResponse.json(ErrorResponse.unauthorized('Not admin'), { status: 401 }) as any);

    const req = new NextRequest('http://localhost:3000/api/admin/users', { method: 'GET' });
    const res = await GET(req);
    const data = await extractJSON(res as any);

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });
});
