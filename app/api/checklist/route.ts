import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/checklist - Get checklist(s) for a portfolio
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId');
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (id) {
      // Get single checklist with tasks
      const checklist = await prisma.dailyChecklist.findUnique({
        where: { id },
        include: {
          tasks: {
            orderBy: {
              urgency: 'desc',
            },
          },
        },
      });

      if (!checklist) {
        return NextResponse.json(
          { error: 'Checklist not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(checklist);
    } else if (portfolioId) {
      if (date) {
        // Get checklist for specific date
        const checklist = await prisma.dailyChecklist.findFirst({
          where: {
            portfolioId,
            date: new Date(date),
          },
          include: {
            tasks: {
              orderBy: {
                urgency: 'desc',
              },
            },
          },
        });

        return NextResponse.json(checklist);
      } else {
        // Get all checklists for portfolio
        const checklists = await prisma.dailyChecklist.findMany({
          where: { portfolioId },
          include: {
            tasks: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 30, // Last 30 days
        });

        return NextResponse.json(checklists);
      }
    } else {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching checklist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist' },
      { status: 500 }
    );
  }
}

// POST /api/checklist - Create a new daily checklist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      portfolioId,
      date,
      totalTasks,
      completedTasks,
      completionPercentage,
      currentStreak,
      longestStreak,
    } = body;

    // Validation
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    const checklist = await prisma.dailyChecklist.create({
      data: {
        portfolioId,
        date: date ? new Date(date) : new Date(),
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        completionPercentage: completionPercentage || 0,
        currentStreak: currentStreak || 0,
        longestStreak: longestStreak || 0,
      },
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error('Error creating checklist:', error);
    return NextResponse.json(
      { error: 'Failed to create checklist' },
      { status: 500 }
    );
  }
}

// PUT /api/checklist - Update a checklist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      totalTasks,
      completedTasks,
      completionPercentage,
      currentStreak,
      longestStreak,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Checklist ID is required' },
        { status: 400 }
      );
    }

    const checklist = await prisma.dailyChecklist.update({
      where: { id },
      data: {
        ...(totalTasks !== undefined && { totalTasks }),
        ...(completedTasks !== undefined && { completedTasks }),
        ...(completionPercentage !== undefined && { completionPercentage }),
        ...(currentStreak !== undefined && { currentStreak }),
        ...(longestStreak !== undefined && { longestStreak }),
      },
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    );
  }
}

// DELETE /api/checklist - Delete a checklist
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Checklist ID is required' },
        { status: 400 }
      );
    }

    await prisma.dailyChecklist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    return NextResponse.json(
      { error: 'Failed to delete checklist' },
      { status: 500 }
    );
  }
}
