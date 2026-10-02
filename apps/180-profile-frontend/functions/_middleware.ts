// Cloudflare Pages Edge Middleware for 180 Core Unified Subdomain Routing
interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;
  const appParam = url.searchParams.get('app');

  // Bypass static assets, scripts, images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return context.next();
  }

  // 1. 180 AUTH (auth.180workspace.com / 180auth.* / ?app=auth)
  if (hostname.startsWith('auth.') || hostname.startsWith('180auth.') || appParam === 'auth') {
    if (pathname === '/' || pathname === '' || pathname === '/login') {
      return context.env.ASSETS.fetch(new URL('/auth/login', context.request.url));
    }
    if (pathname === '/consent') {
      return context.env.ASSETS.fetch(new URL('/auth/consent', context.request.url));
    }
    if (pathname === '/register' || pathname === '/signup') {
      return context.env.ASSETS.fetch(new URL('/auth/register', context.request.url));
    }
    if (!pathname.startsWith('/auth')) {
      return context.env.ASSETS.fetch(new URL(`/auth${pathname}`, context.request.url));
    }
  }

  // 2. 180 PAY (pay.180workspace.com / 180pay.* / ?app=pay)
  if (hostname.startsWith('pay.') || hostname.startsWith('180pay.') || appParam === 'pay') {
    if (pathname === '/' || pathname === '') {
      return context.env.ASSETS.fetch(new URL('/checkout/default', context.request.url));
    }
    if (pathname === '/demo' || pathname === '/sandbox') {
      return context.env.ASSETS.fetch(new URL('/checkout/default', context.request.url));
    }
    if (!pathname.startsWith('/checkout')) {
      const cleanPath = pathname.replace(/^\//, '');
      return context.env.ASSETS.fetch(new URL(`/checkout/${cleanPath}`, context.request.url));
    }
  }

  // 3. 180 PROFILE (profile.180workspace.com / 180profile.* / default)
  return context.next();
};
