import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin';
import { updateUserTier, updateUserAdminStatus, getProfileAsAdmin } from '@lib/supabase/db';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/users/[id]
 *
 * Update user tier or admin status
 * Admin only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin authorization
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { tier, is_admin } = body;

    // Validate user exists
    const user = await getProfileAsAdmin(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let updatedUser = user;

    // Update tier if provided
    if (tier !== undefined) {
      if (!['free', 'basic', 'premium'].includes(tier)) {
        return NextResponse.json(
          { error: 'Invalid tier value' },
          { status: 400 }
        );
      }

      const result = await updateUserTier(userId, tier);
      if (!result) {
        return NextResponse.json(
          { error: 'Failed to update tier' },
          { status: 500 }
        );
      }
      updatedUser = result;
    }

    // Update admin status if provided
    if (is_admin !== undefined) {
      if (typeof is_admin !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid is_admin value' },
          { status: 400 }
        );
      }

      const result = await updateUserAdminStatus(userId, is_admin);
      if (!result) {
        return NextResponse.json(
          { error: 'Failed to update admin status' },
          { status: 500 }
        );
      }
      updatedUser = result;
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tier: updatedUser.tier,
        is_admin: updatedUser.is_admin,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
