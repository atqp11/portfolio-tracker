/**
 * Admin DAO Tests
 *
 * Tests for admin data access layer functions
 */

import * as adminDao from '@backend/modules/admin/dao/admin.dao';
import { createAdminClient } from '@lib/supabase/admin';

jest.mock('@lib/supabase/admin');

describe('Admin DAO', () => {
  let mockSelect: jest.Mock;
  let mockEq1: jest.Mock;
  let mockEq2: jest.Mock;
  let mockFrom: jest.Mock;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a proper mock chain for Supabase query
    mockEq2 = jest.fn();
    mockEq1 = jest.fn().mockReturnValue({ data: null, error: null });
    mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: mockEq2,
      }),
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
    });

    mockSupabase = {
      from: mockFrom,
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('countActiveAdmins', () => {
    it('should return count of active admins', async () => {
      mockEq2.mockResolvedValue({
        data: [{ id: 'admin1' }, { id: 'admin2' }],
        error: null,
      });

      const count = await adminDao.countActiveAdmins();

      expect(count).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(mockEq2).toHaveBeenCalledWith('is_active', true);
    });

    it('should return 0 when no active admins exist', async () => {
      mockEq2.mockResolvedValue({
        data: [],
        error: null,
      });

      const count = await adminDao.countActiveAdmins();

      expect(count).toBe(0);
    });

    it('should throw error when database query fails', async () => {
      mockEq2.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(adminDao.countActiveAdmins()).rejects.toThrow(
        'Failed to count active admins: Database connection failed'
      );
    });
  });
});

