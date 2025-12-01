/**
 * Admin Waitlist API Route
 *
 * Admin-only endpoints to manage waitlist entries.
 * - GET: List all waitlist entries with pagination
 * - DELETE: Remove a waitlist entry by ID
 * - PATCH: Mark entries as notified
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@lib/auth/admin';
import { ErrorResponse, SuccessResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Query params schema for GET
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  notified: z.enum(['true', 'false', 'all']).default('all'),
});

/**
 * GET /api/admin/waitlist
 *
 * List all waitlist entries with pagination and filtering
 */
export async function GET(request: NextRequest) {
  // Require admin authorization
  const authError = await requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = listQuerySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      notified: searchParams.get('notified') || 'all',
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        ErrorResponse.validation('Invalid query parameters', undefined, queryValidation.error.issues),
        { status: 400 }
      );
    }

    const { page, limit, notified } = queryValidation.data;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    if (notified === 'true') {
      where.notified = true;
    } else if (notified === 'false') {
      where.notified = false;
    }

    // Fetch waitlist entries and total count in parallel
    const [entries, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          notified: true,
          createdAt: true,
        },
      }),
      prisma.waitlist.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      SuccessResponse.create({
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to fetch waitlist entries'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/waitlist
 *
 * Remove a waitlist entry by ID (pass { id: "..." } in body)
 */
export async function DELETE(request: NextRequest) {
  // Require admin authorization
  const authError = await requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        ErrorResponse.validation('Waitlist entry ID is required'),
        { status: 400 }
      );
    }

    // Check if entry exists
    const existing = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        ErrorResponse.notFound('Waitlist entry'),
        { status: 404 }
      );
    }

    // Delete the entry
    await prisma.waitlist.delete({
      where: { id },
    });

    console.log(`Admin deleted waitlist entry: ${existing.email} (${id})`);

    return NextResponse.json(
      SuccessResponse.create({
        message: 'Waitlist entry deleted successfully',
        deletedEmail: existing.email,
      })
    );
  } catch (error) {
    console.error('Error deleting waitlist entry:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to delete waitlist entry'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/waitlist
 *
 * Mark waitlist entries as notified (pass { ids: [...], notified: true/false })
 */
export async function PATCH(request: NextRequest) {
  // Require admin authorization
  const authError = await requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { ids, notified } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        ErrorResponse.validation('IDs array is required'),
        { status: 400 }
      );
    }

    if (typeof notified !== 'boolean') {
      return NextResponse.json(
        ErrorResponse.validation('notified must be a boolean'),
        { status: 400 }
      );
    }

    // Update entries
    const result = await prisma.waitlist.updateMany({
      where: { id: { in: ids } },
      data: { notified },
    });

    console.log(`Admin updated ${result.count} waitlist entries: notified=${notified}`);

    return NextResponse.json(
      SuccessResponse.create({
        message: `Updated ${result.count} waitlist entries`,
        updatedCount: result.count,
      })
    );
  } catch (error) {
    console.error('Error updating waitlist entries:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to update waitlist entries'),
      { status: 500 }
    );
  }
}
