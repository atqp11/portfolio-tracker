import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    // Validate email format (server-side)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingEntry) {
      return NextResponse.json(
        {
          success: true,
          message: "You're already on the waitlist! We'll notify you when we launch.",
          alreadyExists: true
        }
      );
    }

    // Create new waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        name: name || null,
      },
    });

    console.log(`New waitlist signup: ${email}${name ? ` (${name})` : ''}`);

    return NextResponse.json({
      success: true,
      message: "Thank you for joining our waitlist!",
      id: waitlistEntry.id,
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    );
  }
}
