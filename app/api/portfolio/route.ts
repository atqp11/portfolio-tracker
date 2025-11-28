/**
 * Portfolio API Routes
 *
 * CRUD operations for portfolios with auth and validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { portfolioController } from '@/server/controllers/portfolio.controller';
import { getUserProfile } from '@/lib/auth/session';
import { SuccessResponse, ErrorResponse } from '@/lib/types/base/response.dto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/portfolio - Get all portfolios or a specific portfolio by ID (RLS enforced)
export async function GET(request: NextRequest) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const includeRelations = searchParams.get('include') === 'true';

    if (id) {
      const portfolio = await portfolioController.getPortfolioById(id);
      return NextResponse.json(portfolio);
    } else {
      const portfolios = await portfolioController.getUserPortfolios(includeRelations);
      return NextResponse.json(portfolios);
    }
  } catch (error) {
    console.error('Error fetching portfolios:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      if (error.message.includes('access denied')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ error: 'Failed to fetch portfolios' }, { status: 500 });
  }
}

// POST /api/portfolio - Create a new portfolio (RLS enforced)
export async function POST(request: NextRequest) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { createPortfolioSchema } = await import('@/lib/validators/schemas');

    const validation = createPortfolioSchema.safeParse(body);
    if (!validation.success) {
      const { formatZodError } = await import('@/lib/validators/schemas');
      const formatted = formatZodError(validation.error);
      return NextResponse.json({ error: 'Invalid portfolio data', details: formatted.errors }, { status: 400 });
    }

    const portfolio = await portfolioController.createPortfolio(validation.data);
    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 });
  }
}

// PUT /api/portfolio - Update a portfolio (RLS enforced)
export async function PUT(request: NextRequest) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { updatePortfolioSchema } = await import('@/lib/validators/schemas');

    const validation = updatePortfolioSchema.safeParse(body);
    if (!validation.success) {
      const { formatZodError } = await import('@/lib/validators/schemas');
      const formatted = formatZodError(validation.error);
      return NextResponse.json({ error: 'Invalid portfolio data', details: formatted.errors }, { status: 400 });
    }

    const portfolio = await portfolioController.updatePortfolio(id, validation.data);
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to update portfolio' }, { status: 500 });
  }
}

// DELETE /api/portfolio - Delete a portfolio (RLS enforced)
export async function DELETE(request: NextRequest) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    await portfolioController.deletePortfolio(id);
    // Successful deletion — respond with 204 No Content
    return new NextResponse(null, { status: 204 });

    //return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting portfolio:', error);

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to delete portfolio' }, { status: 500 });
  }
}
