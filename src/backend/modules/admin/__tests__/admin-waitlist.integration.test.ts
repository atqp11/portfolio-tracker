/**
 * Admin Waitlist Route Integration Tests
 *
 * Tests the admin waitlist management endpoints:
 * - GET: List waitlist entries with pagination
 * - DELETE: Remove waitlist entry
 * - PATCH: Update notified status
 */

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { extractJSON } from '@test/helpers/test-utils';
import { GET, DELETE, PATCH } from '@app/api/admin/waitlist/route';
import { requireAdmin } from '@lib/auth/admin';
import { prisma } from '@lib/prisma';
import { ErrorResponse } from '@lib/types/base/response.dto';

jest.mock('@lib/auth/admin');
jest.mock('@lib/prisma', () => ({
  prisma: {
    waitlist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Admin Waitlist Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/waitlist', () => {
    it('returns waitlist entries for admin with pagination', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      const mockEntries = [
        { id: 'w1', email: 'user1@example.com', name: 'User 1', notified: false, createdAt: new Date() },
        { id: 'w2', email: 'user2@example.com', name: 'User 2', notified: true, createdAt: new Date() },
      ];

      (mockPrisma.waitlist.findMany as jest.Mock).mockResolvedValue(mockEntries);
      (mockPrisma.waitlist.count as jest.Mock).mockResolvedValue(2);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', { method: 'GET' });
      const res = await GET(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.entries).toHaveLength(2);
      expect(data.data.entries[0].email).toBe('user1@example.com');
      expect(data.data.pagination.total).toBe(2);
      expect(data.data.pagination.page).toBe(1);
    });

    it('supports pagination parameters', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      (mockPrisma.waitlist.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.waitlist.count as jest.Mock).mockResolvedValue(100);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist?page=2&limit=10', { method: 'GET' });
      const res = await GET(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(200);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(10);
      expect(data.data.pagination.totalPages).toBe(10);
      expect(data.data.pagination.hasNext).toBe(true);
      expect(data.data.pagination.hasPrev).toBe(true);
    });

    it('filters by notified status', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      (mockPrisma.waitlist.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.waitlist.count as jest.Mock).mockResolvedValue(0);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist?notified=false', { method: 'GET' });
      await GET(req);

      expect(mockPrisma.waitlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { notified: false },
        })
      );
    });

    it('returns auth error when not admin', async () => {
      mockRequireAdmin.mockResolvedValue(
        NextResponse.json(ErrorResponse.unauthorized('Not admin'), { status: 401 }) as any
      );

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', { method: 'GET' });
      const res = await GET(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/waitlist', () => {
    it('deletes waitlist entry for admin', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      const mockEntry = { id: 'w1', email: 'delete@example.com', name: 'Delete Me' };
      (mockPrisma.waitlist.findUnique as jest.Mock).mockResolvedValue(mockEntry);
      (mockPrisma.waitlist.delete as jest.Mock).mockResolvedValue(mockEntry);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'w1' }),
      });
      const res = await DELETE(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedEmail).toBe('delete@example.com');
      expect(mockPrisma.waitlist.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    });

    it('returns 404 when entry not found', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);
      (mockPrisma.waitlist.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'nonexistent' }),
      });
      const res = await DELETE(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('returns validation error when id missing', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      const res = await DELETE(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns auth error when not admin', async () => {
      mockRequireAdmin.mockResolvedValue(
        NextResponse.json(ErrorResponse.unauthorized('Not admin'), { status: 401 }) as any
      );

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'w1' }),
      });
      const res = await DELETE(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/waitlist', () => {
    it('updates notified status for multiple entries', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);
      (mockPrisma.waitlist.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'PATCH',
        body: JSON.stringify({ ids: ['w1', 'w2', 'w3'], notified: true }),
      });
      const res = await PATCH(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.updatedCount).toBe(3);
      expect(mockPrisma.waitlist.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['w1', 'w2', 'w3'] } },
        data: { notified: true },
      });
    });

    it('returns validation error when ids missing', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'PATCH',
        body: JSON.stringify({ notified: true }),
      });
      const res = await PATCH(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns validation error when notified not boolean', async () => {
      mockRequireAdmin.mockResolvedValue(null as any);

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'PATCH',
        body: JSON.stringify({ ids: ['w1'], notified: 'yes' }),
      });
      const res = await PATCH(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns auth error when not admin', async () => {
      mockRequireAdmin.mockResolvedValue(
        NextResponse.json(ErrorResponse.unauthorized('Not admin'), { status: 401 }) as any
      );

      const req = new NextRequest('http://localhost:3000/api/admin/waitlist', {
        method: 'PATCH',
        body: JSON.stringify({ ids: ['w1'], notified: true }),
      });
      const res = await PATCH(req);
      const data = await extractJSON(res as any);

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });
});
