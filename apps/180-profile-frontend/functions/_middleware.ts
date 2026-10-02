interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
}

type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, any>;
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
}) => Promise<Response> | Response;

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
    if (pathname.startsWith('/checkout/manage-subscription')) {
      return context.env.ASSETS.fetch(new URL('/checkout/manage-subscription/default.html', context.request.url));
    }
    return context.env.ASSETS.fetch(new URL('/checkout/default.html', context.request.url));
  }

  // 3. 180 PROFILE (profile.180workspace.com / 180profile.* / default)
  return context.next();
};
