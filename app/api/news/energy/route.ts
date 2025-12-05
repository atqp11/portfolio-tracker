import { NextResponse } from 'next/server';
import { rssFeedDAO } from '@backend/modules/news/dao/rss-feed.dao';

/**
 * Energy News API Route
 *
 * Fetches energy/oil/gas news from free RSS feeds (Investing.com, Google News, etc.)
 * No API key required.
 */
export async function GET(request: Request) {
  try {
    console.log('[/api/news/energy] Fetching energy news from RSS feeds');

    // Fetch energy news from RSS feeds
    const articles = await rssFeedDAO.getCommodityNews('energy', 10);

    // Format articles to match expected response format
    const news = articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
    }));

    console.log(`[/api/news/energy] Returning ${news.length} articles from RSS feeds`);

    return NextResponse.json(news);
  } catch (error: any) {
    console.error('[/api/news/energy] Error fetching energy news:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch energy news' },
      { status: 500 }
    );
  }
}
