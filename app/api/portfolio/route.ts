import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/portfolio - Get all portfolios or a specific portfolio by ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      // Get single portfolio with all relations
      const portfolio = await prisma.portfolio.findUnique({
        where: { id },
        include: {
          stocks: true,
          theses: true,
          checklists: {
            include: {
              tasks: true,
            },
            orderBy: {
              date: 'desc',
            },
            take: 1, // Get only the most recent checklist
          },
        },
      });

      if (!portfolio) {
        return NextResponse.json(
          { error: 'Portfolio not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(portfolio);
    } else {
      // Get all portfolios with basic info
      const portfolios = await prisma.portfolio.findMany({
        include: {
          stocks: true,
          _count: {
            select: {
              theses: true,
              checklists: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(portfolios);
    }
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Create a new portfolio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      name,
      type,
      initialValue,
      targetValue,
      borrowedAmount,
      marginCallLevel,
    } = body;

    // Validation
    if (!userId || !name || !type) {
      return NextResponse.json(
        { error: 'User ID, name and type are required' },
        { status: 400 }
      );
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
        type,
        initialValue: initialValue || 0,
        targetValue: targetValue || 0,
        borrowedAmount: borrowedAmount || 0,
        marginCallLevel: marginCallLevel || 0,
      },
      include: {
        stocks: true,
        theses: true,
        checklists: true,
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolio - Update a portfolio
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      type,
      initialValue,
      targetValue,
      borrowedAmount,
      marginCallLevel,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(initialValue !== undefined && { initialValue }),
        ...(targetValue !== undefined && { targetValue }),
        ...(borrowedAmount !== undefined && { borrowedAmount }),
        ...(marginCallLevel !== undefined && { marginCallLevel }),
      },
      include: {
        stocks: true,
        theses: true,
        checklists: true,
      },
    });

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio - Delete a portfolio
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    await prisma.portfolio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
