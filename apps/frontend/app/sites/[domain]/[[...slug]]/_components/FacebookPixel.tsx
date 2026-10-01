'use client';

import { useEffect } from 'react';

export function FacebookPixel({ pixels }: { pixels: any[] }) {
    useEffect(() => {
        if (!pixels || !pixels.length) return;
        
        pixels.forEach((pixel: any) => {
            // DB field is `provider` (legacy payloads used `type`). Pixel IDs are numeric — strip anything else
            // before it is interpolated into the inline script.
            const provider = String(pixel.provider || pixel.type || '').toLowerCase();
            const pixelId = String(pixel.pixelId || '').replace(/[^0-9]/g, '');
            if (provider === 'facebook' && pixelId) {
                try {
                    const script = document.createElement('script');
                    script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixelId}');fbq('track', 'PageView');`;
                    document.head.appendChild(script);
                } catch (e) {
                    console.error('Failed to inject pixel:', e);
                }
            }
        });
    }, [pixels]);

    return null;
}
