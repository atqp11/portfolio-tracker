/**
 * Stock API Routes
 *
 * CRUD operations for stocks with auth and validation (RLS enforced).
 */

import { NextRequest, NextResponse } from 'next/server';
import { stockController } from '@/lib/controllers/stock.controller';
import { getUserProfile } from '@/lib/auth/session';
import { SuccessResponse, ErrorResponse } from '@/lib/dto/base/response.dto';

export const dynamic = 'force-dynamic';

// GET /api/stocks - Get all stocks for a portfolio or a single stock by ID (RLS enforced)
export async function GET(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId');
    const id = searchParams.get('id');

    if (id) {
      // Get single stock (RLS ensures user can only access their own)
      const stock = await stockController.getStockById(id);
      return NextResponse.json(SuccessResponse.create(stock));
    } else if (portfolioId) {
      // Get all stocks for a portfolio (RLS filters to current user automatically)
      const stocks = await stockController.getPortfolioStocks(portfolioId);
      return NextResponse.json(SuccessResponse.create(stocks));
    } else {
      return NextResponse.json(
        ErrorResponse.badRequest('Portfolio ID or Stock ID is required'),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching stocks:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(ErrorResponse.notFound('Stock'), { status: 404 });
      }
      if (error.message.includes('access denied')) {
        return NextResponse.json(ErrorResponse.forbidden('Access denied'), { status: 403 });
      }
    }

    return NextResponse.json(
      ErrorResponse.internal('Failed to fetch stocks'),
      { status: 500 }
    );
  }
}

// POST /api/stocks - Add a stock to a portfolio (RLS enforced)
export async function POST(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const { createStockSchema } = await import('@/lib/validators/schemas');

    const validation = createStockSchema.safeParse(body);
    if (!validation.success) {
      const { formatZodError } = await import('@/lib/validators/schemas');
      const formatted = formatZodError(validation.error);
      return NextResponse.json(
        ErrorResponse.validation('Invalid stock data', undefined, formatted.errors),
        { status: 400 }
      );
    }

    // Create stock (RLS automatically checks portfolio ownership)
    const stock = await stockController.createStock(validation.data);

    return NextResponse.json(
      SuccessResponse.create(stock),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating stock:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to create stock'),
      { status: 500 }
    );
  }
}

// PUT /api/stocks - Update a stock (RLS enforced)
export async function PUT(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    // Get stock ID from query
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        ErrorResponse.badRequest('Stock ID is required'),
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { updateStockSchema } = await import('@/lib/validators/schemas');

    const validation = updateStockSchema.safeParse(body);
    if (!validation.success) {
      const { formatZodError } = await import('@/lib/validators/schemas');
      const formatted = formatZodError(validation.error);
      return NextResponse.json(
        ErrorResponse.validation('Invalid stock data', undefined, formatted.errors),
        { status: 400 }
      );
    }

    // Update stock (RLS ensures user can only update their own)
    const stock = await stockController.updateStock(id, validation.data);

    return NextResponse.json(SuccessResponse.create(stock));
  } catch (error) {
    console.error('Error updating stock:', error);

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(ErrorResponse.forbidden('Access denied'), { status: 403 });
    }

    return NextResponse.json(
      ErrorResponse.internal('Failed to update stock'),
      { status: 500 }
    );
  }
}

// DELETE /api/stocks - Delete a stock (RLS enforced)
export async function DELETE(request: NextRequest) {
  try {
    // Authentication is handled by Supabase RLS
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
    }

    // Get stock ID from query
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        ErrorResponse.badRequest('Stock ID is required'),
        { status: 400 }
      );
    }

    // Delete stock (RLS ensures user can only delete their own)
    const result = await stockController.deleteStock(id);

    return NextResponse.json(SuccessResponse.noContent());
  } catch (error) {
    console.error('Error deleting stock:', error);

    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(ErrorResponse.forbidden('Access denied'), { status: 403 });
    }

    return NextResponse.json(
      ErrorResponse.internal('Failed to delete stock'),
      { status: 500 }
    );
  }
}
