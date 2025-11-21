import { NextResponse } from 'next/server';
import { NewsService } from '@/lib/services/news.service';
import { NewsAPIError } from '@/types/news.dto';

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

    // Fetch portfolio data
    const portfolioResponse = await fetch(`${request.headers.get('origin') || 'http://localhost:3000'}/api/portfolio?id=${portfolioId}`);
    if (!portfolioResponse.ok) {
      throw new Error('Failed to fetch portfolio');
    }

    const portfolio = await portfolioResponse.json();

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