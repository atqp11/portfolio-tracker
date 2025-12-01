import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin';
import { usersService } from './service/users.service';
import { SuccessResponse, ErrorResponse } from '@lib/types/base/response.dto';

export class AdminController {
  async getUsers(req: NextRequest): Promise<NextResponse> {
    // Check admin authorization
    const authError = await requireAdmin(req);
    if (authError) return authError as NextResponse;

    try {
      const users = await usersService.fetchAllUsersWithUsage();
      return NextResponse.json(SuccessResponse.create({ users, total: users.length }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(ErrorResponse.internal('Failed to fetch users'), { status: 500 });
    }
  }
}

export const adminController = new AdminController();
