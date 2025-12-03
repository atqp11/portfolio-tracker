import { NextResponse } from 'next/server';
import { secEdgarService } from '@backend/modules/stocks/service/sec-edgar.service';
import { checkQuota, trackUsage, type TierName } from '@lib/tiers';
import { getUserProfile } from '@lib/auth/session';
import { ErrorResponse, SuccessResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let cik = searchParams.get('cik');
  const symbol = searchParams.get('symbol');

  // Authenticate user
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(ErrorResponse.unauthorized(), { status: 401 });
  }

  // Check quota (but don't track yet)
  const quotaCheck = await checkQuota(
    profile.id,
    'secFiling',
    profile.tier as TierName
  );

  if (!quotaCheck.allowed) {
    return NextResponse.json(
      ErrorResponse.quotaExceeded('Monthly SEC filing quota exceeded', {
        reason: quotaCheck.reason,
        upgradeUrl: '/pricing',
      }),
      { status: 429 }
    );
  }

  // If cik is not valid and symbol is provided, resolve CIK from symbol
  if ((!cik || !/^\d{8,10}$/.test(cik.trim())) && symbol) {
    cik = await secEdgarService.getCik(symbol.trim().toUpperCase());
    if (!cik) {
      return NextResponse.json(
        ErrorResponse.notFound('CIK for symbol'),
        { status: 404 }
      );
    }
  }

  // If cik is still not valid, error
  if (!cik || !/^\d{8,10}$/.test(cik.trim())) {
    return NextResponse.json(
      ErrorResponse.validation('Missing or invalid CIK. Provide a valid CIK (8-10 digits) or a symbol.'),
      { status: 400 }
    );
  }
  try {
    console.log(`📄 Fetching SEC filings for CIK: ${cik} (user: ${profile.id}, tier: ${profile.tier})`);
    const data = await secEdgarService.getCompanyFilings(cik.trim());

    // If successful, track usage (non-blocking)
    try {
      await trackUsage(profile.id, 'secFiling', profile.tier as TierName);
    } catch (trackError) {
      // Log but don't fail the request - user already got their data
      console.error('[SEC Edgar] Failed to track usage:', {
        userId: profile.id,
        tier: profile.tier,
        error: trackError instanceof Error ? trackError.message : String(trackError),
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    // Graceful error handling for known cases
    if (err.message?.includes('timed out')) {
      return NextResponse.json(
        ErrorResponse.timeout('SEC EDGAR request timed out. Please try again.'),
        { status: 504 }
      );
    }
    if (err.message?.includes('Network error')) {
      return NextResponse.json(
        ErrorResponse.create('EXTERNAL_SERVICE_ERROR', 'Network error when calling SEC EDGAR. Please check connectivity.'),
        { status: 502 }
      );
    }
    if (err.message?.includes('Invalid JSON')) {
      return NextResponse.json(
        ErrorResponse.create('EXTERNAL_SERVICE_ERROR', 'SEC EDGAR returned invalid data. Try a different CIK.'),
        { status: 502 }
      );
    }
    if (err.message?.includes('Unexpected SEC EDGAR API response structure')) {
      return NextResponse.json(
        ErrorResponse.create('EXTERNAL_SERVICE_ERROR', 'SEC EDGAR returned unexpected data. Try a different CIK.'),
        { status: 502 }
      );
    }
    if (err.message?.includes('No filings found for this CIK or symbol.')) {
      return NextResponse.json(
        ErrorResponse.notFound('SEC filings'),
        { status: 404 }
      );
    }
    if (err.message?.includes('SEC EDGAR API error')) {
      if (err.message?.includes('404')) {
        return NextResponse.json(
          ErrorResponse.notFound('SEC filings for this CIK'),
          { status: 404 }
        );
      }
      return NextResponse.json(
        ErrorResponse.create('EXTERNAL_SERVICE_ERROR', 'SEC EDGAR API error.'),
        { status: 502 }
      );
    }
    // Fallback: generic error
    return NextResponse.json(
      ErrorResponse.internal(err.message || 'Unknown error'),
      { status: 500 }
    );
  }
}
