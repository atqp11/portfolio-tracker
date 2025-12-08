import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js Proxy for Supabase Authentication
 *
 * Next.js 16 uses proxy.ts instead of middleware.ts
 * This proxy runs on every request to:
 * 1. Refresh Supabase auth sessions
 * 2. Protect authenticated routes
 * 3. Redirect authenticated users away from auth pages
 * 4. Protect test pages (admin-only or disabled via config)
 *
 * Test Pages Configuration:
 * - ALLOW_TEST_PAGES=false (default) - Completely disables test pages (returns 404)
 * - ALLOW_TEST_PAGES=true - Enables test pages
 * - REQUIRE_ADMIN_FOR_TESTS=true (default) - Only admins can access test pages
 * - REQUIRE_ADMIN_FOR_TESTS=false - Any authenticated user can access test pages
 *
 * Security Levels for /tests/* routes:
 * 1. Production (default): ALLOW_TEST_PAGES=false → 404 for everyone
 * 2. Admin-only: ALLOW_TEST_PAGES=true, REQUIRE_ADMIN_FOR_TESTS=true → Admin authentication required
 * 3. Dev mode: ALLOW_TEST_PAGES=true, REQUIRE_ADMIN_FOR_TESTS=false → Any authenticated user
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create Supabase client for server-side auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // SECURITY: Use getClaims() for authentication check in proxy
  // This validates JWT signatures against published public keys (cached JWKS)
  // More performant than getUser() which makes network requests every time
  const { data, error } = await supabase.auth.getClaims()
  const user = !error && data?.claims?.sub ? { id: data.claims.sub } : null

  // Test pages protection - admin-only or disabled via config
  if (request.nextUrl.pathname.startsWith('/tests')) {
    const allowTestPages = process.env.ALLOW_TEST_PAGES === 'true'
    const requireAdminForTests = process.env.REQUIRE_ADMIN_FOR_TESTS !== 'false' // Default: true

    // If test pages are completely disabled, return 404
    if (!allowTestPages) {
      return NextResponse.rewrite(new URL('/404', request.url))
    }

    // If admin is required for test pages (default behavior)
    if (requireAdminForTests) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/signin'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      // Check admin status from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        // Authenticated non-admin users get 403 Forbidden
        return new NextResponse('Forbidden - Admin access required', { status: 403 })
      }
    }
  }

  // Admin route protection - check admin status for /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check admin status from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Protected routes - redirect to sign-in if not authenticated
  if (!user && (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/thesis') ||
    request.nextUrl.pathname.startsWith('/checklist') ||
    request.nextUrl.pathname.startsWith('/fundamentals') ||
    request.nextUrl.pathname.startsWith('/risk') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/usage') ||
    request.nextUrl.pathname.startsWith('/billing') ||
    request.nextUrl.pathname.startsWith('/stocks') ||
    request.nextUrl.pathname.startsWith('/admin')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (
    request.nextUrl.pathname.startsWith('/auth/signin') ||
    request.nextUrl.pathname.startsWith('/auth/signup')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
