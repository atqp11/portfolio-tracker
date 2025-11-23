import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name } = body;

    // Validate required fields
    if (!id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: id, email' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (existingUser) {
      // User already exists, return success
      return NextResponse.json({
        success: true,
        user: existingUser,
      });
    }

    // Create new user with default "free" tier
    const user = await prisma.user.create({
      data: {
        id,
        email,
        name: name || null,
        tier: 'free',
      },
    });

    console.log(`User created: ${email} (${id}) - Tier: free`);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
