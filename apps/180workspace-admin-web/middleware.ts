import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are always public (no auth required)
const PUBLIC_PATHS = ['/login', '/signup', '/workspace-setup'];
// Patterns for static/internal Next.js files to ignore
const STATIC_PATTERNS = ['/_next', '/favicon', '/static', '/api'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Skip static files and internal Next.js routes
    if (STATIC_PATTERNS.some(p => pathname.startsWith(p)) || pathname.includes('.')) {
        return NextResponse.next();
    }

    // 2. Auth enforcement for protected routes
    const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === '/';
    const isSuperAdminPath = pathname.startsWith('/superadmin');

    if (!isPublicPath && !isSuperAdminPath) {
        const authToken = request.cookies.get('platform_auth_token')?.value;

        if (!authToken) {
            const url = new URL('/superadmin/login', request.url);
            url.searchParams.set('returnUrl', pathname);
            return NextResponse.redirect(url);
        }

    // 3. Onboarding guard — if user needs onboarding, redirect to workspace-setup
    const needsOnboarding = request.cookies.get('needs_onboarding')?.value;
    if (needsOnboarding && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL(`/workspace-setup?onboardingToken=${needsOnboarding}`, request.url));
    }
}

if (pathname === '/login') {
    return NextResponse.redirect(new URL('/superadmin/login', request.url));
}

// 4. Root page logic
if (pathname === '/') {
    return NextResponse.redirect(new URL('/superadmin', request.url));
}

return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
