import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "5196aa96c36083e22fda242c96eb50b636d481f16da7117177ba037334341575";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const hostname = req.headers.get("host") || "";

  // 1. Internal dynamic site rewrites and fast redirect routes always bypass auth middleware
  if (
    pathname.startsWith('/sites') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/shield/') ||
    pathname.startsWith('/tag/') ||
    pathname.startsWith('/evaluate/') ||
    pathname.startsWith('/f/') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Define main application domains
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || "180workspace.com";
  const mainDomains = [
    "180workspace.com",
    "www.180workspace.com",
    "app.180workspace.com",
    rootDomain,
    `www.${rootDomain}`,
    `app.${rootDomain}`
  ].filter(Boolean);

  const isLocalhostBase = /^localhost(:\d+)?$/.test(hostname) || /^127\.0\.0\.1(:\d+)?$/.test(hostname);
  const isCustomDomain = !mainDomains.includes(hostname) && !isLocalhostBase;

  if (isCustomDomain) {
    const search = url.search;
    const PLATFORM_ADMIN_ROUTES = [
      '/login', '/signup', '/onboarding', '/workspace-setup', 
      '/traffic-director', '/advertising', '/crm', '/finance', 
      '/hr', '/settings', '/projects', '/insights', '/communications', 
      '/social-media', '/workspace-tools', '/billing', '/superadmin', 
      '/company-hub'
    ];
    const isPlatformAdminRoute = PLATFORM_ADMIN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

    if (isPlatformAdminRoute) {
      const protocol = req.headers.get('x-forwarded-proto') || (url.protocol.replace(':', ''));
      const port = hostname.split(':')[1];
      const isLocalhostDomain = rootDomain === 'localhost' || rootDomain === '127.0.0.1';
      const baseHost = (isLocalhostDomain && port) ? `${rootDomain}:${port}` : rootDomain;
      const targetUrl = `${protocol}://${baseHost}${pathname}${search}`;
      return NextResponse.redirect(targetUrl);
    }

    const domainKey = hostname.split(':')[0].toLowerCase();
    return NextResponse.rewrite(new URL(`/sites/${domainKey}${pathname}${search}`, req.url));
  }

  // 3. Extract Token - Try multiple extraction strategies to avoid proxy/cookie prefix pitfalls
  let token = await getToken({ req, secret: NEXTAUTH_SECRET, secureCookie: true });
  if (!token) {
    token = await getToken({ req, secret: NEXTAUTH_SECRET, secureCookie: false });
  }

  const platformCookie = req.cookies.get('platform_auth_token')?.value;
  const isAuth = !!token || !!platformCookie;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/onboarding");

  const isSetupPage = pathname.startsWith("/workspace-setup");

  const WORKSPACE_ROUTES = ['/jobs', '/privacy-policy', '/terms-of-service', '/shared', '/sites', '/f', '/api'];
  const is180workspaceRoute = WORKSPACE_ROUTES.some(r => pathname.startsWith(r));

  const isWorkspaceSetupComplete = !!(token?.companyId && token?.isOnboardingComplete) || !!platformCookie;
  const isOnboardingDone = (token?.isFirstLogin === false) || !!(token?.companyId && token?.isOnboardingComplete) || !!platformCookie;

  // 4. Authenticated users hitting "/" (Landing / Dashboard root)
  if (isAuth && pathname === "/") {
    if (!isOnboardingDone) {
      return NextResponse.redirect(new URL("/signup", req.url));
    }
    return NextResponse.next();
  }

  // 5. Unauthenticated users
  if (!isAuth) {
    if (is180workspaceRoute || isAuthPage) {
      return NextResponse.next();
    }
    let from = pathname;
    if (url.search) from += url.search;
    return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url));
  }

  // 6. Already authenticated user trying to access Auth pages
  if (isAuthPage) {
    if (url.searchParams.get('clearSession') === 'true') {
      return NextResponse.next();
    }
    // Allow signup/onboarding if in progress
    if (pathname.startsWith("/signup") || pathname.startsWith("/onboarding")) {
      return NextResponse.next();
    }
    if (isOnboardingDone) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 7. Workspace Setup route
  if (isSetupPage) {
    if (isWorkspaceSetupComplete) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 8. Protected app routes
  if (!isOnboardingDone) {
    return NextResponse.redirect(new URL("/signup", req.url));
  }
  if (!isWorkspaceSetupComplete) {
    return NextResponse.redirect(new URL("/workspace-setup", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|r/|tag/|shield/|evaluate/|.*\\..*).*)",
  ],
};
