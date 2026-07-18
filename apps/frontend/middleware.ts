import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token; console.log('MIDDLEWARE CHECK:', { hasToken: !!token, url: req.nextUrl.pathname });
    const isAuthPage =
      req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/signup") ||
      req.nextUrl.pathname.startsWith("/onboarding")
      
    const isSetupPage = req.nextUrl.pathname.startsWith("/workspace-setup")

    // 180workspace Dashboard routes (Requires Workspace Setup)
    const isIMSRoute = req.nextUrl.pathname.startsWith("/dashboard");

    // PitchIn routes (Accessible by ANYONE with a token, regardless of workspace setup)
    // Anything that is NOT Dashboard, NOT Auth, and NOT Setup is considered a PitchIn route
    const isPitchInRoute = !isIMSRoute && !isAuthPage && !isSetupPage;

    const isWorkspaceSetupComplete = !!(token?.companyId && token?.isOnboardingComplete);
    const isPitchInUser = token?.role === 'USER';
    const isOnboardingDone = token?.isFirstLogin === false;  // isFirstLogin: true = NOT done

    // 0. Redirect authenticated users hitting the landing page to their dashboard
    if (isAuth && req.nextUrl.pathname === "/") {
       if (!isOnboardingDone) {
         return NextResponse.redirect(new URL("/signup", req.url));
       }
       return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 1. Unauthenticated users
    if (!isAuth) {
      if (isPitchInRoute) {
        return null; // allow public access
      }
      if (!isAuthPage) {
        let from = req.nextUrl.pathname;
        if (req.nextUrl.search) from += req.nextUrl.search;
        return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url));
      }
      return null;
    }

    // 2. Prevent accessing auth pages if already authenticated
    if (isAuthPage) {
      if (req.nextUrl.searchParams.get('clearSession') === 'true') {
        return null;
      }
      // Allow them to stay on /signup or /onboarding if they are in the middle of it
      if (req.nextUrl.pathname.startsWith("/signup") || req.nextUrl.pathname.startsWith("/onboarding")) {
        return null;
      }
      // If onboarding is NOT complete, let them access /login too (they might want to switch accounts)
      // but also redirect from /login to /signup if they have incomplete onboarding
      if (!isOnboardingDone) {
        // If they're on /login, let them stay — they might want to switch accounts
        if (req.nextUrl.pathname.startsWith("/login")) {
          return null;
        }
        return NextResponse.redirect(new URL("/signup", req.url));
      }
      // Onboarding is done — redirect away from auth pages to their dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 3. User is trying to access 180workspace routes (Dashboard, CRM, etc.)
    if (isIMSRoute) {
       // If personal onboarding is not complete, redirect to signup
       if (!isOnboardingDone) {
         return NextResponse.redirect(new URL("/signup", req.url));
       }
       if (!isWorkspaceSetupComplete) {
         // Force them to complete workspace setup
         return NextResponse.redirect(new URL("/workspace-setup", req.url));
       }
       return null; // Allow access
    }

    // 4. User is trying to access Workspace Setup
    if (isSetupPage) {
       // If they already completed it, redirect them to 180workspace Dashboard
       if (isWorkspaceSetupComplete) {
         return NextResponse.redirect(new URL("/dashboard", req.url));
       }
       return null; // Allow access to workspace setup
    }

    // 5. User is trying to access PitchIn routes
    if (isPitchInRoute) {
       // If personal onboarding is not complete, redirect back to signup
       if (!isOnboardingDone) {
         return NextResponse.redirect(new URL("/signup", req.url));
       }
       return null;
    }

    return null
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // Let the middleware function handle the logic
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
