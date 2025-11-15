import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stocks - Get all stocks for a portfolio
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId');
    const id = searchParams.get('id');

    if (id) {
      // Get single stock
      const stock = await prisma.stock.findUnique({
        where: { id },
      });

      if (!stock) {
        return NextResponse.json(
          { error: 'Stock not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(stock);
    } else if (portfolioId) {
      // Get all stocks for a portfolio
      const stocks = await prisma.stock.findMany({
        where: { portfolioId },
        orderBy: {
          symbol: 'asc',
        },
      });

      return NextResponse.json(stocks);
    } else {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stocks' },
      { status: 500 }
    );
  }
}

// POST /api/stocks - Add a stock to a portfolio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      portfolioId,
      symbol,
      name,
      shares,
      avgPrice,
      currentPrice,
      actualValue,
    } = body;

    // Validation
    if (!portfolioId || !symbol || !name) {
      return NextResponse.json(
        { error: 'Portfolio ID, symbol, and name are required' },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.create({
      data: {
        portfolioId,
        symbol,
        name,
        shares: shares || 0,
        avgPrice: avgPrice || 0,
        currentPrice: currentPrice || 0,
        actualValue: actualValue || 0,
      },
    });

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    console.error('Error creating stock:', error);
    return NextResponse.json(
      { error: 'Failed to create stock' },
      { status: 500 }
    );
  }
}

// PUT /api/stocks - Update a stock
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      symbol,
      name,
      shares,
      avgPrice,
      currentPrice,
      actualValue,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.update({
      where: { id },
      data: {
        ...(symbol && { symbol }),
        ...(name && { name }),
        ...(shares !== undefined && { shares }),
        ...(avgPrice !== undefined && { avgPrice }),
        ...(currentPrice !== undefined && { currentPrice }),
        ...(actualValue !== undefined && { actualValue }),
      },
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}

// DELETE /api/stocks - Delete a stock
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    await prisma.stock.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock' },
      { status: 500 }
    );
  }
}
