/**
 * Portfolio News API Route
 *
 * Fetches news from free RSS feeds based on portfolio type.
 * Uses middleware pattern consistent with other routes.
 * No API key required - uses free RSS feeds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rssFeedDAO } from '@backend/modules/news/dao/rss-feed.dao';
import { portfolioController } from '@backend/modules/portfolio/portfolio.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';
import { ValidationError } from '@backend/common/middleware/validation.middleware';
import { ErrorResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Log when module is loaded
console.log('[/api/news/portfolio/[id]] Route module loaded');

/**
 * GET /api/news/portfolio/[id]
 * Returns news articles for a specific portfolio based on its type
 */
async function handleGet(
  request: NextRequest,
  context: { params: Promise<{ id: string }>; auth: { userId: string; userTier: string; profile: any } }
) {
  console.log('[/api/news/portfolio] Route handler called', { 
    url: request.url,
    contextKeys: Object.keys(context),
    hasParams: !!context.params 
  });
  
  // Await params from Next.js App Router
  const params = await context.params;
  const { id: portfolioId } = params;
  
  console.log('[/api/news/portfolio] Portfolio ID:', portfolioId);

  if (!portfolioId) {
    throw new ValidationError('Portfolio ID is required', { portfolioId });
  }

  // Fetch portfolio data via internal controller
  // RLS ensures user can only access their own portfolios
  const portfolio = await portfolioController.getPortfolioById(portfolioId);

  if (!portfolio) {
    throw new NotFoundError('Portfolio not found');
  }

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

    // Extract stock symbols from stocks relation
    // Note: portfolio.stocks comes from the includeRelations query
    if (portfolio.stocks && portfolio.stocks.length > 0) {
      portfolio.stocks.forEach((stock: any) => {
        if (stock.symbol) {
          keywords.push(stock.symbol);
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
}

// Export with middleware chain
// Next.js App Router passes params in context: (request, { params })
// We need to handle the case where getUserProfile might fail due to missing profile
export const GET = withErrorHandler(
  async (request: NextRequest, context: any) => {
    console.log('[/api/news/portfolio] Route called', { 
      url: request.url,
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : []
    });

    // Manually handle auth to provide better error messages
    try {
      // First check if user is authenticated
      const { getUser } = await import('@lib/auth/session');
      const user = await getUser();
      
      if (!user) {
        console.error('[/api/news/portfolio] No user found - not authenticated');
        return NextResponse.json(
          ErrorResponse.unauthorized('Authentication required. Please sign in.'),
          { status: 401 }
        );
      }

      console.log('[/api/news/portfolio] User authenticated:', user.id, user.email);

      // Try to get profile
      const { getUserProfile } = await import('@lib/auth/session');
      let profile;
      try {
        profile = await getUserProfile();
      } catch (profileError: any) {
        console.error('[/api/news/portfolio] Profile fetch failed:', {
          userId: user.id,
          error: profileError.message,
          stack: profileError.stack
        });
        
        // Check if it's a database error or missing profile
        if (profileError.message?.includes('Failed to fetch user profile')) {
          // Profile might not exist - check the actual Supabase error
          const { createClient } = await import('@lib/supabase/server');
          const supabase = await createClient();
          const { data: profileData, error: profileDbError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileDbError) {
            console.error('[/api/news/portfolio] Supabase profile error:', {
              code: profileDbError.code,
              message: profileDbError.message,
              details: profileDbError.details,
              hint: profileDbError.hint
            });
            
            // If profile doesn't exist (PGRST116 = not found)
            if (profileDbError.code === 'PGRST116') {
              return NextResponse.json(
                ErrorResponse.unauthorized('User profile not found. Please contact support.'),
                { status: 401 }
              );
            }
          }
          
          return NextResponse.json(
            ErrorResponse.unauthorized('Unable to verify user profile. Please try signing out and back in.'),
            { status: 401 }
          );
        }
        
        throw profileError;
      }
      
      if (!profile) {
        console.error('[/api/news/portfolio] Profile is null for user:', user.id);
        return NextResponse.json(
          ErrorResponse.unauthorized('User profile not found. Please contact support.'),
          { status: 401 }
        );
      }

      console.log('[/api/news/portfolio] Profile found:', profile.id, profile.tier);

      // Add auth to context
      const enhancedContext = {
        ...context,
        auth: {
          userId: profile.id,
          userTier: profile.tier,
          profile,
        },
      };

      return handleGet(request, enhancedContext);
    } catch (error: any) {
      console.error('[/api/news/portfolio] Unexpected error:', error);
      
      // Re-throw to be handled by withErrorHandler
      throw error;
    }
  }
);