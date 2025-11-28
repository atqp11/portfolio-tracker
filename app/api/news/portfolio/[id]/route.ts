import { NextResponse } from 'next/server';
import { NewsService } from '@backend/modules/news/service/news.service';
import { portfolioController } from '@backend/modules/portfolio/portfolio.controller';
import { NewsAPIError } from '@/lib/types/news.dto';

const newsService = new NewsService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
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

    return NextResponse.json(news);
  } catch (error: any) {
    console.error('Error fetching portfolio news:', error);

    // Handle specific NewsAPI errors
    if (error instanceof NewsAPIError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch portfolio news' },
      { status: 500 }
    );
  }
}