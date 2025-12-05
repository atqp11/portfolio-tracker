import { NextResponse } from 'next/server';
import { rssFeedDAO } from '@backend/modules/news/dao/rss-feed.dao';
import { portfolioController } from '@backend/modules/portfolio/portfolio.controller';
import { ErrorResponse } from '@lib/types/base/response.dto';
import { getUserProfile } from '@lib/auth/session';

/**
 * Portfolio News API Route
 *
 * Fetches news from free RSS feeds based on portfolio type.
 * No API key required.
 */
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

    console.log(`[/api/news/portfolio/${portfolioId}] Fetching RSS news for ${portfolio.type} portfolio: ${portfolio.name}`);

    let articles;

    // Get news based on portfolio type
    const portfolioType = portfolio.type?.toLowerCase() || 'general';

    if (portfolioType === 'energy') {
      // Energy portfolio - use commodity news with energy keywords
      articles = await rssFeedDAO.getCommodityNews('energy', 10);
    } else if (portfolioType === 'copper' || portfolioType === 'commodity') {
      // Copper/commodity portfolio - use commodity news with copper keywords
      articles = await rssFeedDAO.getCommodityNews('copper', 10);
    } else {
      // General portfolio - use market news with portfolio-specific keywords
      const keywords: string[] = [];

      // Extract stock symbols from holdings
      if (portfolio.holdings && portfolio.holdings.length > 0) {
        portfolio.holdings.forEach((holding: any) => {
          if (holding.symbol) {
            keywords.push(holding.symbol);
          }
        });
      }

      // Add general market keywords
      keywords.push('stock', 'market', 'trading');

      articles = await rssFeedDAO.getMarketNews(10, keywords);
    }

    // Format articles to match expected response format
    const news = articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
    }));

    console.log(`[/api/news/portfolio/${portfolioId}] Returning ${news.length} articles from RSS feeds (type: ${portfolioType})`);

    return NextResponse.json({ success: true, data: news });
  } catch (error: any) {
    console.error('[/api/news/portfolio] Error fetching portfolio news:', error);

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