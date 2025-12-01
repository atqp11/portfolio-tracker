import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { z } from 'zod';
import { ErrorResponse, SuccessResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';

// Zod schema for waitlist signup
const waitlistSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  name: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = waitlistSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ErrorResponse.validation(
          validation.error.issues[0]?.message || 'Invalid request',
          validation.error.issues[0]?.path[0]?.toString(),
          validation.error.issues
        ),
        { status: 400 }
      );
    }

    const { email, name } = validation.data;

    // Check if email already exists
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingEntry) {
      return NextResponse.json(
        SuccessResponse.create({
          message: "You're already on the waitlist! We'll notify you when we launch.",
          alreadyExists: true,
        })
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

    return NextResponse.json(
      SuccessResponse.create({
        message: 'Thank you for joining our waitlist!',
        id: waitlistEntry.id,
      })
    );
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to join waitlist. Please try again.'),
      { status: 500 }
    );
  }
}
