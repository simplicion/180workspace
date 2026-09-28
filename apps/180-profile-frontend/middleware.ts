import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const pathname = url.pathname;

  // Bypass internal Next.js assets, API routes, and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like favicon.ico, images
  ) {
    return NextResponse.next();
  }

  // 1. Handling auth.180workspace.com (Authentication & OAuth Consent)
  if (hostname.startsWith('auth.') || url.searchParams.get('app') === 'auth') {
    if (pathname === '/') {
      url.pathname = '/auth/login';
      return NextResponse.rewrite(url);
    }
    if (pathname === '/consent') {
      url.pathname = '/auth/consent';
      return NextResponse.rewrite(url);
    }
    if (pathname === '/login') {
      url.pathname = '/auth/login';
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 2. Handling pay.180workspace.com (1-Click Sovereign Wallet Checkout Popup)
  if (hostname.startsWith('pay.') || url.searchParams.get('app') === 'pay') {
    if (pathname === '/' || pathname === '') {
      // Direct visit to pay domain without session
      url.pathname = '/checkout/demo';
      return NextResponse.rewrite(url);
    }
    // If accessing /:sessionId directly on pay.domain
    if (!pathname.startsWith('/checkout') && !pathname.startsWith('/auth')) {
      const sessionId = pathname.replace(/^\//, '');
      url.pathname = `/checkout/${sessionId}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 3. Handling profile.180workspace.com (Universal User Dashboard)
  // Default pass-through for overview (/), wallet (/wallet), and settings (/settings)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
