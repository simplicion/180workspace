import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";

    // Define main application domains (add more if needed, e.g., production domains)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "180workspace.com";
    const mainDomains = [rootDomain, `www.${rootDomain}`, `app.${rootDomain}`];
    
    // Check if the request is for a custom domain or a tenant subdomain
    // It is a custom domain/subdomain if it doesn't match mainDomains and isn't the base localhost (with or without port)
    const isLocalhostBase = /^localhost(:\d+)?$/.test(hostname) || /^127\.0\.0\.1(:\d+)?$/.test(hostname);
    const isCustomDomain = !mainDomains.includes(hostname) && !isLocalhostBase;

    if (isCustomDomain) {
      const path = req.nextUrl.pathname;
      // Allow internal Next.js routes, API routes, and dashboard routes to pass through normally
      if (
        !path.startsWith('/_next') &&
        !path.startsWith('/api') &&
        !path.startsWith('/dashboard') &&
        !path.startsWith('/login') &&
        !path.startsWith('/signup') &&
        !path.startsWith('/workspace-setup') &&
        !path.startsWith('/onboarding')
      ) {
        // Rewrite to the dynamic sites directory
        return NextResponse.rewrite(new URL(`/sites/${hostname}${path}`, req.url));
      }
    }

    const token = req.nextauth.token
    const isAuth = !!token; console.log('MIDDLEWARE CHECK:', { hasToken: !!token, url: req.nextUrl.pathname, isCustomDomain, companySlug: token?.companySlug, isFirstLogin: token?.isFirstLogin });
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

    // 0. Redirect authenticated users hitting the landing page or dashboard to their subdomain
    if (isAuth && (req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/dashboard"))) {
       if (!isOnboardingDone) {
         if (req.nextUrl.pathname === "/") return NextResponse.redirect(new URL("/signup", req.url));
       } else {
         // Handle automatic redirect to the company subdomain
         if (token?.companySlug && isWorkspaceSetupComplete) {
             let protocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol || 'http:';
             if (!protocol.endsWith(':')) protocol += ':';
             
             let targetHost = hostname;
             
             if (isLocalhostBase) {
                 targetHost = `${token.companySlug}.${hostname}`;
             } else {
                 targetHost = `${token.companySlug}.${rootDomain}`;
             }
             
             if (targetHost !== hostname) {
                 const targetPath = req.nextUrl.pathname === "/" ? "/dashboard" : req.nextUrl.pathname;
                 return NextResponse.redirect(new URL(`${targetPath}${req.nextUrl.search}`, `${protocol}//${targetHost}`));
             }
         }
         
         if (req.nextUrl.pathname === "/") {
             return NextResponse.redirect(new URL("/dashboard", req.url));
         }
       }
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
