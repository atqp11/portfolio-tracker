import { NextResponse } from 'next/server';
import { NewsService } from '@backend/modules/news/service/news.service';
import { portfolioController } from '@backend/modules/portfolio/portfolio.controller';
import { NewsAPIError } from '@lib/types/news.dto';
import { ErrorResponse } from '@lib/types/base/response.dto';
import { getUserProfile } from '@lib/auth/session';

const newsService = new NewsService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        ErrorResponse.unauthorized(),
        { status: 401 }
      );
    }

    const { id: portfolioId } = await params;

    if (!portfolioId) {
      return NextResponse.json(
        ErrorResponse.validation('Portfolio ID is required'),
        { status: 400 }
      );
    }

    // Fetch portfolio data via internal controller so server-side auth (cookies) is preserved
    const portfolio = await portfolioController.getPortfolioById(portfolioId);

    // Generate AI-powered query based on portfolio holdings
    const query = await NewsService.generateNewsQueryForPortfolio(portfolio);
    const cacheKey = `market-news-portfolio-${portfolioId}`;

    const articles = await newsService.getNewsAPI(query, cacheKey, 10);

    // Format articles to match expected response format
    const news = articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source?.name || 'Unknown',
      publishedAt: article.publishedAt,
    }));

    return NextResponse.json({ success: true, data: news });
  } catch (error: any) {
    console.error('Error fetching portfolio news:', error);

    // Handle specific NewsAPI errors
    if (error instanceof NewsAPIError) {
      return NextResponse.json(
        ErrorResponse.create(error.type, error.message),
        { status: error.status }
      );
    }

    // Handle not found
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        ErrorResponse.notFound('Portfolio'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      ErrorResponse.internal(error.message || 'Failed to fetch portfolio news'),
      { status: 500 }
    );
  }
}