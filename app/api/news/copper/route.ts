import { NextResponse } from 'next/server';
import { rssFeedDAO } from '@backend/modules/news/dao/rss-feed.dao';

/**
 * Copper News API Route
 *
 * Fetches copper/mining news from free RSS feeds (Investing.com, Google News, etc.)
 * No API key required.
 */
export async function GET(request: Request) {
  try {
    console.log('[/api/news/copper] Fetching copper news from RSS feeds');

    // Fetch copper/mining news from RSS feeds
    const articles = await rssFeedDAO.getCommodityNews('copper', 10);

    // Format articles to match expected response format
    const news = articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
    }));

    console.log(`[/api/news/copper] Returning ${news.length} articles from RSS feeds`);

    return NextResponse.json(news);
  } catch (error: any) {
    console.error('[/api/news/copper] Error fetching copper news:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch copper news' },
      { status: 500 }
    );
  }
}
