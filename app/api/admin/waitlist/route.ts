import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all waitlist entries, ordered by creation date (newest first)
    const waitlist = await prisma.waitlist.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        notified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      waitlist,
      count: waitlist.length,
    });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist data' },
      { status: 500 }
    );
  }
}
