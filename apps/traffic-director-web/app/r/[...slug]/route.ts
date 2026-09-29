import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendUrl() {
  return process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4002';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const subpath = slug ? slug.join('/') : '';
  const search = request.nextUrl.search || '';
  const targetUrl = `${getBackendUrl()}/r/${subpath}${search}`;

  const forwardHeaders: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    // Preserve client IP and edge headers
    if (key !== 'host') {
      forwardHeaders[key] = val;
    }
  });

  const clientIp = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || '';
  if (clientIp) {
    forwardHeaders['x-forwarded-for'] = clientIp;
    forwardHeaders['x-real-ip'] = clientIp;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'manual',
      cache: 'no-store'
    });

    // If 301, 302, 307 redirect
    if ([301, 302, 303, 307, 308].includes(upstreamRes.status)) {
      const location = upstreamRes.headers.get('location');
      if (location) {
        return NextResponse.redirect(location, upstreamRes.status as any);
      }
    }

    const responseBody = await upstreamRes.arrayBuffer();
    const resHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding' && key !== 'content-encoding') {
        resHeaders.set(key, value);
      }
    });

    return new NextResponse(responseBody, {
      status: upstreamRes.status,
      headers: resHeaders
    });
  } catch (err: any) {
    console.error('[TrafficDirector Web Proxy] Error forwarding to backend:', err.message);
    return new NextResponse(`Traffic Director Edge Error: ${err.message}`, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return GET(request, context);
}
