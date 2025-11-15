import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/thesis - Get all theses for a portfolio or a specific thesis by ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId');
    const id = searchParams.get('id');

    if (id) {
      // Get single thesis
      const thesis = await prisma.investmentThesis.findUnique({
        where: { id },
      });

      if (!thesis) {
        return NextResponse.json(
          { error: 'Thesis not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(thesis);
    } else if (portfolioId) {
      // Get all theses for a portfolio
      const theses = await prisma.investmentThesis.findMany({
        where: { portfolioId },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(theses);
    } else {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching theses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch theses' },
      { status: 500 }
    );
  }
}

// POST /api/thesis - Create a new investment thesis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      portfolioId,
      ticker,
      title,
      description,
      rationale,
      bearCase,
      risks,
      keyMetrics,
      stopLossRules,
      exitCriteria,
      thesisHealthScore,
      urgency,
      status,
    } = body;

    // Validation
    if (!portfolioId || !title || !ticker) {
      return NextResponse.json(
        { error: 'Portfolio ID, title, and ticker are required' },
        { status: 400 }
      );
    }

    const thesis = await prisma.investmentThesis.create({
      data: {
        portfolioId,
        ticker,
        title,
        description: description || '',
        rationale: rationale || '',
        bearCase: bearCase || null,
        risks: risks || [],
        keyMetrics: keyMetrics || [],
        stopLossRules: stopLossRules || [],
        exitCriteria: exitCriteria || {},
        thesisHealthScore: thesisHealthScore || 50,
        urgency: urgency || 'green',
        status: status || 'active',
      },
    });

    return NextResponse.json(thesis, { status: 201 });
  } catch (error) {
    console.error('Error creating thesis:', error);
    return NextResponse.json(
      { error: 'Failed to create thesis' },
      { status: 500 }
    );
  }
}

// PUT /api/thesis - Update a thesis
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      rationale,
      risks,
      indicators,
      targetPrice,
      stopLoss,
      timeHorizon,
      confidence,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Thesis ID is required' },
        { status: 400 }
      );
    }

    const thesis = await prisma.investmentThesis.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(rationale !== undefined && { rationale }),
        ...(risks !== undefined && { risks }),
        ...(indicators !== undefined && { indicators }),
        ...(targetPrice !== undefined && { targetPrice }),
        ...(stopLoss !== undefined && { stopLoss }),
        ...(timeHorizon !== undefined && { timeHorizon }),
        ...(confidence !== undefined && { confidence }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(thesis);
  } catch (error) {
    console.error('Error updating thesis:', error);
    return NextResponse.json(
      { error: 'Failed to update thesis' },
      { status: 500 }
    );
  }
}

// DELETE /api/thesis - Delete a thesis
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Thesis ID is required' },
        { status: 400 }
      );
    }

    await prisma.investmentThesis.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thesis:', error);
    return NextResponse.json(
      { error: 'Failed to delete thesis' },
      { status: 500 }
    );
  }
}
