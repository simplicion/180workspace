import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";

    // Internal dynamic site rewrites and fast redirect routes always bypass auth middleware
    if (
      req.nextUrl.pathname.startsWith('/sites') ||
      req.nextUrl.pathname.startsWith('/r/') ||
      req.nextUrl.pathname.startsWith('/shield/') ||
      req.nextUrl.pathname.startsWith('/tag/') ||
      req.nextUrl.pathname.startsWith('/evaluate/') ||
      req.nextUrl.pathname.startsWith('/f/')
    ) {
      return NextResponse.next();
    }

    // Define main application domains (add more if needed, e.g., production domains)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || "";
    const mainDomains = [ "180workspace.com", "www.180workspace.com", "app.180workspace.com", 
      rootDomain,
      `www.${rootDomain}`,
      `app.${rootDomain}`,
      "180workspace.com"
    ].filter(Boolean);

    // Check if the request is for a custom domain or a company subdomain
    // It is a custom domain/subdomain if it doesn't match mainDomains and isn't the base localhost (with or without port)
    const isLocalhostBase = /^localhost(:\d+)?$/.test(hostname) || /^127\.0\.0\.1(:\d+)?$/.test(hostname);
    const isCustomDomain = !mainDomains.includes(hostname) && !isLocalhostBase;

    if (isCustomDomain) {
      const path = req.nextUrl.pathname;
      const search = req.nextUrl.search;

      // Allow internal Next.js assets, API routes, well-known paths, and public forms to pass through
      if (
        path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.startsWith('/.well-known') ||
        path.startsWith('/f/')
      ) {
        return NextResponse.next();
      }

      // Platform internal administrative & auth routes must redirect to the primary platform domain
      const PLATFORM_ADMIN_ROUTES = [
        '/login', '/signup', '/onboarding', '/workspace-setup', 
        '/traffic-director', '/advertising', '/crm', '/finance', 
        '/hr', '/settings', '/projects', '/insights', '/communications', 
        '/social-media', '/workspace-tools', '/billing', '/superadmin', 
        '/company-hub'
      ];
      const isPlatformAdminRoute = PLATFORM_ADMIN_ROUTES.some(r => path === r || path.startsWith(r + '/'));

      if (isPlatformAdminRoute) {
        const protocol = req.headers.get('x-forwarded-proto') || (url.protocol.replace(':', ''));
        const port = hostname.split(':')[1];
        const isLocalhostDomain = rootDomain === 'localhost' || rootDomain === '127.0.0.1';
        const baseHost = (isLocalhostDomain && port) ? `${rootDomain}:${port}` : rootDomain;
        const targetUrl = `${protocol}://${baseHost}${path}${search}`;

        if (isLocalhostDomain && process.env.NODE_ENV !== 'production') {
          return new NextResponse(
            `<html><head><meta http-equiv="refresh" content="0; url=${targetUrl}"></head><body>Redirecting to secure platform... <script>window.location.href = "${targetUrl}";</script></body></html>`,
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        }
        return NextResponse.redirect(targetUrl);
      }

      // ALL other paths on custom domains/subdomains (e.g. /prince, /, /about, etc.) rewrite to dynamic sites directory
      const domainKey = hostname.split(':')[0].toLowerCase();
      return NextResponse.rewrite(new URL(`/sites/${domainKey}${path}${search}`, req.url));
    }

    const token = req.nextauth.token
    const isAuth = !!token; console.log('MIDDLEWARE CHECK:', { hasToken: !!token, url: req.nextUrl.pathname, isCustomDomain, companySlug: token?.companySlug, isFirstLogin: token?.isFirstLogin });
    const isAuthPage =
      req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/signup") ||
      req.nextUrl.pathname.startsWith("/onboarding")

    const isSetupPage = req.nextUrl.pathname.startsWith("/workspace-setup")

    const WORKSPACE_ROUTES = ['/jobs', '/privacy-policy', '/terms-of-service', '/shared', '/sites', '/f', '/api'];
    const is180workspaceRoute = WORKSPACE_ROUTES.some(r => req.nextUrl.pathname.startsWith(r));

    // 180workspace Platform routes (Requires Workspace Setup)
    // Anything that is NOT 180workspace, NOT Auth, NOT Setup, and NOT API is considered an IMS route
    const isApiRoute = req.nextUrl.pathname.startsWith('/api');
    const isIMSRoute = !is180workspaceRoute && !isAuthPage && !isSetupPage && !isApiRoute;

    const isWorkspaceSetupComplete = !!(token?.companyId && token?.isOnboardingComplete);
    const is180workspaceUser = token?.role === 'USER';
    const isOnboardingDone = token?.isFirstLogin === false;  // isFirstLogin: true = NOT done

    // 0. Redirect authenticated users hitting the landing page to their dashboard (now root)
    if (isAuth && req.nextUrl.pathname === "/") {
      if (!isOnboardingDone) {
        return NextResponse.redirect(new URL("/signup", req.url));
      } else {
        // Without /dashboard prefix, we might want them to go to a default app like /projects or let them stay on /
        // Let's let them stay on / which will render the default platform layout
        return null;
      }
    }

    // 1. Unauthenticated users
    if (!isAuth) {
      if (is180workspaceRoute) {
        return null; // allow public access
      }
      if (!isAuthPage) {
        let from = req.nextUrl.pathname;
        if (req.nextUrl.search) from += req.nextUrl.search;

        // If they are on a custom domain, redirect them to the root domain's login page
        // (Wait, we already handle this at the top for specific paths, but for others we still redirect)
        if (isCustomDomain) {
          const protocol = req.headers.get('x-forwarded-proto') || (url.protocol.replace(':', ''));
          const port = hostname.split(':')[1];
          const isLocalhostDomain = rootDomain === 'localhost' || rootDomain === '127.0.0.1';
          const baseHost = (isLocalhostDomain && port) ? `${rootDomain}:${port}` : rootDomain;
          const targetUrl = `${protocol}://${baseHost}/login?from=${encodeURIComponent(from)}`;

          if (isLocalhostDomain && process.env.NODE_ENV !== 'production') {
            return new NextResponse(
              `<html><head><meta http-equiv="refresh" content="0; url=${targetUrl}"></head><body>Redirecting to secure platform... <script>window.location.href = "${targetUrl}";</script></body></html>`,
              { status: 200, headers: { 'Content-Type': 'text/html' } }
            );
          }
          return NextResponse.redirect(targetUrl);
        }

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
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/signup", req.url));
      }
      // Onboarding is done — redirect away from auth pages to their dashboard
      return NextResponse.redirect(new URL("/", req.url));
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

      return NextResponse.next(); // Allow access
    }

    // 4. User is trying to access Workspace Setup
    if (isSetupPage) {
      // If they already completed it, redirect them to 180workspace Dashboard
      if (isWorkspaceSetupComplete) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next(); // Allow access to workspace setup
    }

    // 5. User is trying to access 180workspace routes
    if (is180workspaceRoute) {
      // If user is authenticated but personal onboarding is not complete, redirect back to signup
      if (isAuth && !isOnboardingDone) {
        return NextResponse.redirect(new URL("/signup", req.url));
      }
      return NextResponse.next();
    }

    return NextResponse.next();
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
    "/((?!api|_next/static|_next/image|favicon.ico|r/|tag/|shield/|evaluate/|.*\\..*).*)",
  ],
}
