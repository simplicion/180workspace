import { NextResponse } from 'next/server';

/**
 * For Middleware: Returns a 200 OK response with a script tag to force absolute redirection.
 * This bypasses Next.js internal URL normalization which causes relative redirect loops on localhost.
 */
export function hardRedirect(url: string) {
    console.log(`[RedirectUtils] Executing Hard Redirect to: ${url}`);
    return new NextResponse(
        `<html><head><script>window.location.href="${url}"</script></head><body>Redirecting to ${url}...</body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
    );
}

/**
 * For Client-side Components: Forces a fresh browser navigation.
 */
export function clientSideHardRedirect(url: string) {
    if (typeof window !== 'undefined') {
        console.log(`[RedirectUtils] Executing Client-side Hard Redirect to: ${url}`);
        window.location.href = url;
    }
}

