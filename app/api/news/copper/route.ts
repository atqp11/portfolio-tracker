import { NextResponse } from 'next/server';
import { NewsService } from '@backend/modules/news/service/news.service';
import { NewsAPIError } from '@lib/types/news.dto';

const newsService = new NewsService();

export async function GET(request: Request) {
  try {
    // Get portfolio ID from query params
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    let query: string;
    let cacheKey: string;

    if (portfolioId) {
      // Fetch portfolio and generate AI-powered query
      const portfolioResponse = await fetch(`${request.headers.get('origin') || 'http://localhost:3000'}/api/portfolio?id=${portfolioId}`);
      if (!portfolioResponse.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const portfolio = await portfolioResponse.json();

      // Generate AI-powered query based on portfolio holdings
      query = await NewsService.generateNewsQueryForPortfolio(portfolio);
      cacheKey = `market-news-copper-${portfolioId}`;
    } else {
      // Default copper market news
      query = 'copper OR mining OR metals';
      cacheKey = 'market-news-copper';
    }

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
    console.error('Error fetching copper news:', error);

    // Handle specific NewsAPI errors
    if (error instanceof NewsAPIError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch copper news' },
      { status: 500 }
    );
  }
}
