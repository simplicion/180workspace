import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
  const resolvedParams = await params;
  const slugPath = Array.isArray(resolvedParams.slug) ? resolvedParams.slug.join('/') : resolvedParams.slug;
  const targetUrl = new URL(`/r/${slugPath}${request.nextUrl.search}`, backendUrl);

  try {
    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'user-agent': request.headers.get('user-agent') || '',
        'accept': request.headers.get('accept') || '*/*',
        'accept-language': request.headers.get('accept-language') || '',
        'referer': request.headers.get('referer') || '',
        'cf-connecting-ip': request.headers.get('cf-connecting-ip') || '',
        'true-client-ip': request.headers.get('true-client-ip') || '',
        'x-client-ip': request.headers.get('x-client-ip') || '',
        'x-real-ip': request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''),
        'x-forwarded-for': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
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

    const body = await res.text();
    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('content-type') || 'text/html; charset=utf-8');
    headers.set('Cache-Control', res.headers.get('cache-control') || 'no-store, no-cache, must-revalidate');

    return new NextResponse(body, {
      status: res.status,
      headers
    });
  } catch (err: any) {
    return new NextResponse(`Traffic Director Edge Error: ${err.message}`, { status: 502 });
  }
}
