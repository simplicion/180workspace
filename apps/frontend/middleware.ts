import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "build-time-secret-placeholder-min-32-chars";

const domainRegistryCache = new Map<string, { type: string; slug?: string; expiresAt: number }>();

async function getTrafficLinkSlug(domainKey: string): Promise<string | null> {
  const now = Date.now();
  const cached = domainRegistryCache.get(domainKey);
  if (cached && cached.expiresAt > now) {
    return cached.type === 'TRAFFIC_LINK' ? (cached.slug || null) : null;
  }

  try {
    const candidateBases = [
      process.env.BACKEND_INTERNAL_URL,
      process.env.NODE_ENV === 'production' ? 'http://backend:4000' : null,
      process.env.NEXT_PUBLIC_BACKEND_URL,
      process.env.NEXT_PUBLIC_API_URL,
      'http://localhost:4004',
      'http://localhost:4002',
      'http://127.0.0.1:4004',
      'http://127.0.0.1:4002',
      'https://api.180workspace.com'
    ].filter(Boolean) as string[];

    const uniqueBases = Array.from(new Set(candidateBases));

    for (const apiBase of uniqueBases) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${apiBase}/api/public/domains/resolve?domain=${encodeURIComponent(domainKey)}`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const type = data?.type || '';
          const slug = data?.payload?.slug || '';
          domainRegistryCache.set(domainKey, {
            type,
            slug,
            expiresAt: now + 60 * 1000 // 1 min TTL
          });
          return type === 'TRAFFIC_LINK' && slug ? slug : null;
        }
      } catch (e) {
        // Try next candidate base
      }
    }
  } catch (err) {
    // Fallthrough to /sites
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const hostname = req.headers.get("host") || "";

  // 1. Static assets, icons, media, public files and Next.js internal assets bypass auth middleware
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|json|woff|woff2|ttf|eot|otf|mp3|mp4|webm|pdf|txt|xml|css|js|map)$/i.test(pathname);
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/.well-known') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/downloads/') ||
    isStaticFile
  ) {
    return NextResponse.next();
  }

  // If already rewritten to internal sites handler or fast proxy handler
  if (pathname.startsWith('/sites') || pathname.startsWith('/r/')) {
    return NextResponse.next();
  }

  // 2. Define main application domains
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || "180workspace.com";
  const mainDomains = [
    "180workspace.com",
    "www.180workspace.com",
    "app.180workspace.com",
    "media.180workspace.com",
    rootDomain,
    `www.${rootDomain}`,
    `app.${rootDomain}`,
    `media.${rootDomain}`
  ].filter(Boolean);

  const isLocalhostBase = /^localhost(:\d+)?$/.test(hostname) || /^127\.0\.0\.1(:\d+)?$/.test(hostname);
  const isCustomDomain = !mainDomains.includes(hostname) && !isLocalhostBase;

  if (isCustomDomain) {
    const search = url.search;
    const PLATFORM_ADMIN_ROUTES = [
      '/login', '/signup', '/onboarding', '/workspace-setup', 
      '/traffic-director', '/advertising', '/crm', '/finance', 
      '/hr', '/settings', '/projects', '/insights', '/communications', 
      '/social-media', '/workspace-tools', '/voiceforce', '/media-editor', '/video-studio', '/billing', '/superadmin', 
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

    // Check if domain is a Traffic Director Smart Link to rewrite directly to Route Handler (/r/:slug)
    // This allows raw HTML streaming with native scripts and stylesheets, avoiding React Server Component DOM wrapping.
    const trafficLinkSlug = await getTrafficLinkSlug(domainKey);
    if (trafficLinkSlug) {
      const subpathParam = pathname && pathname !== '/' ? `subpath=${encodeURIComponent(pathname.replace(/^\/+/, ''))}` : '';
      let targetQuery = '';
      if (search && subpathParam) {
        targetQuery = `${search}&${subpathParam}`;
      } else if (search) {
        targetQuery = search;
      } else if (subpathParam) {
        targetQuery = `?${subpathParam}`;
      }
      return NextResponse.rewrite(new URL(`/r/${trafficLinkSlug}${targetQuery}`, req.url));
    }

    return NextResponse.rewrite(new URL(`/sites/${domainKey}${pathname}${search}`, req.url));
  }

  // 3. Fast redirect routes & public forms/payslips on main platform domains bypass auth
  if (
    pathname.startsWith('/shield/') ||
    pathname.startsWith('/tag/') ||
    pathname.startsWith('/evaluate/') ||
    pathname.startsWith('/f/') ||
    pathname.startsWith('/payslip') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 4. Extract Token - Try multiple extraction strategies to avoid proxy/cookie prefix pitfalls
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

  const WORKSPACE_ROUTES = ['/jobs', '/privacy-policy', '/terms-of-service', '/shared', '/sites', '/f', '/payslip', '/api'];
  const is180workspaceRoute = WORKSPACE_ROUTES.some(r => pathname.startsWith(r));

  const isWorkspaceSetupComplete = token ? !!token.isOnboardingComplete : (!!platformCookie && !isSetupPage);
  const isOnboardingDone = token ? (token.isFirstLogin === false || !!token.isOnboardingComplete) : !!platformCookie;

  // 5. Authenticated users hitting "/" (Landing / Dashboard root)
  if (isAuth && pathname === "/") {
    if (!isOnboardingDone) {
      return NextResponse.redirect(new URL("/signup", req.url));
    }
    if (!isWorkspaceSetupComplete) {
      return NextResponse.redirect(new URL("/workspace-setup", req.url));
    }
    if (hostname.startsWith("media.") || hostname.startsWith("studio.")) {
      return NextResponse.rewrite(new URL("/media-editor", req.url));
    }
    return NextResponse.next();
  }

  // 6. Unauthenticated users
  if (!isAuth) {
    if (is180workspaceRoute || isAuthPage || isSetupPage) {
      return NextResponse.next();
    }
    let from = pathname;
    if (url.search) from += url.search;
    return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url));
  }

  // 7. Auth pages (/login, /signup, /onboarding) always render safely without server loops
  if (isAuthPage) {
    return NextResponse.next();
  }

  // 8. Workspace Setup route
  if (isSetupPage) {
    if (token?.isOnboardingComplete) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 9. Protected app routes
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Static asset files with extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico, .woff, .woff2, .ttf, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|woff|woff2|ttf|eot|otf|mp3|mp4|webm|pdf|txt|xml|css|js|map)$).*)",
  ],
};
