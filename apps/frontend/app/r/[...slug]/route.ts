import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const backendUrl = 
    process.env.BACKEND_INTERNAL_URL || 
    (process.env.NODE_ENV === 'production' ? 'http://backend:4000' : null) || 
    process.env.NEXT_PUBLIC_BACKEND_URL || 
    process.env.NEXT_PUBLIC_API_URL || 
    'http://localhost:4002';

  const resolvedParams = await params;
  const slugPath = Array.isArray(resolvedParams.slug) ? resolvedParams.slug.join('/') : resolvedParams.slug;
  const targetUrl = new URL(`/r/${slugPath}${request.nextUrl.search}`, backendUrl);

  const clientIp = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

  try {
    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'user-agent': request.headers.get('user-agent') || '',
        'accept': request.headers.get('accept') || '*/*',
        'accept-language': request.headers.get('accept-language') || '',
        'referer': request.headers.get('referer') || '',
        // Cloudflare strictly rejects outbound public requests with cf-connecting-ip (Error 1000). Pass via real-ip/forwarded-for instead.
        'true-client-ip': clientIp,
        'x-client-ip': clientIp,
        'x-real-ip': clientIp,
        'x-forwarded-for': request.headers.get('x-forwarded-for') || clientIp,
        'cf-ipcountry': request.headers.get('cf-ipcountry') || '',
        'cf-ipcity': request.headers.get('cf-ipcity') || '',
        'sec-ch-ua': request.headers.get('sec-ch-ua') || '',
        'sec-ch-ua-mobile': request.headers.get('sec-ch-ua-mobile') || '',
        'sec-ch-ua-platform': request.headers.get('sec-ch-ua-platform') || '',
      },
      redirect: 'manual',
      cache: 'no-store'
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) {
        return NextResponse.redirect(location, { status: res.status });
      }
    }

    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('content-type') || 'text/html; charset=utf-8');
    headers.set('Cache-Control', res.headers.get('cache-control') || 'no-store, no-cache, must-revalidate');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Timing-Allow-Origin', '*');

    return new NextResponse(res.body, {
      status: res.status,
      headers
    });
  } catch (err: any) {
    return new NextResponse(`Traffic Director Edge Error: ${err.message}`, { 
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400'
    }
  });
}
