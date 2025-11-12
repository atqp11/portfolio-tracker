import { NextResponse } from 'next/server';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let cache: { data: any; timestamp: number } | null = null;

export async function GET() {
  try {
    // Return cached data if it's still fresh
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      console.log('Returning cached copper news');
      return NextResponse.json(cache.data);
    }

    if (!NEWS_API_KEY) {
      console.error('NEWS_API_KEY is not configured');
      return NextResponse.json(
        { error: 'News API key not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching fresh copper news from NewsAPI...');
    
    // Search for copper-related news
    const query = 'copper OR mining OR metals';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PortfolioTracker/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NewsAPI error:', response.status, errorText);
      
      // Check for specific NewsAPI error codes
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited by NewsAPI', type: 'rateLimited' },
          { status: 429 }
        );
      } else if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid NewsAPI key', type: 'apiKeyInvalid' },
          { status: 401 }
        );
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'NewsAPI key disabled or forbidden', type: 'apiKeyDisabled' },
          { status: 403 }
        );
      }
      
      throw new Error(`NewsAPI request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      console.error('NewsAPI returned error:', data);
      return NextResponse.json(
        { error: data.message || 'NewsAPI error', type: data.code || 'unknown' },
        { status: 500 }
      );
    }

    const articles = data.articles || [];
    console.log(`NewsAPI success: Retrieved ${articles.length} copper articles`);
    
    // Format articles
    const news = articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source?.name || 'Unknown',
      publishedAt: article.publishedAt,
    }));

    // Cache the result
    cache = {
      data: news,
      timestamp: Date.now(),
    };

    return NextResponse.json(news);
  } catch (error: any) {
    console.error('Error fetching copper news:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch copper news' },
      { status: 500 }
    );
  }
}
