'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileCode2, Sparkles, HelpCircle, Copy, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlobalScriptsModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    brand: any;
    updateBrand: (key: string, value: any) => void;
}

const TEMPLATES = {
    metaPixel: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`,

    ga4: `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`,

    gtmHead: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`,

    gtmBody: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,

    tikTok: `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=o||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var c=document.getElementsByTagName("script")[0];c.parentNode.insertBefore(a,c)};
  ttq.load('YOUR_TIKTOK_PIXEL_ID');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`
};

export default function GlobalScriptsModal({ isOpen, setIsOpen, brand, updateBrand }: GlobalScriptsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleApplyTemplate = (target: 'head' | 'body', templateKey: keyof typeof TEMPLATES) => {
        const snippet = TEMPLATES[templateKey];
        if (target === 'head') {
            const current = brand.headScript || '';
            updateBrand('headScript', current ? `${current}\n\n${snippet}` : snippet);
            toast.success('Snippet added to Head Scripts!');
        } else {
            const current = brand.bodyScript || '';
            updateBrand('bodyScript', current ? `${current}\n\n${snippet}` : snippet);
            toast.success('Snippet added to Body Scripts!');
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 99999 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-indigo-50/40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <FileCode2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">Global Website Scripts & Tracking</h3>
                            <p className="text-[11px] text-gray-500">Inject tracking pixels, analytics, and custom code across all pages</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Educational Banner */}
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex gap-3 text-xs text-indigo-950">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <span className="font-bold">Global vs Element Embed:</span> <strong>Global Scripts</strong> runs on <em>every page</em> (perfect for Meta Pixel base setup & GA4). For <em>conversion events</em> (e.g. Lead tracking on Thank You page), use the <strong>Embed Code Element</strong> in the canvas.
                        </div>
                    </div>

                    {/* Quick 1-Click Templates */}
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            1-Click Tracking Presets (Insert into Head)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => handleApplyTemplate('head', 'metaPixel')}
                                className="p-2.5 text-left border border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-xs font-bold text-blue-900 flex flex-col gap-1 transition-all"
                            >
                                <span className="flex items-center gap-1">🟦 Meta Pixel</span>
                                <span className="text-[10px] text-blue-600 font-normal">Base + PageView</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyTemplate('head', 'ga4')}
                                className="p-2.5 text-left border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-xs font-bold text-emerald-900 flex flex-col gap-1 transition-all"
                            >
                                <span className="flex items-center gap-1">🟩 Google Analytics 4</span>
                                <span className="text-[10px] text-emerald-600 font-normal">gtag.js SDK</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyTemplate('head', 'gtmHead')}
                                className="p-2.5 text-left border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-xl text-xs font-bold text-amber-900 flex flex-col gap-1 transition-all"
                            >
                                <span className="flex items-center gap-1">🟨 GTM (Head)</span>
                                <span className="text-[10px] text-amber-600 font-normal">Tag Manager</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleApplyTemplate('head', 'tikTok')}
                                className="p-2.5 text-left border border-gray-300 hover:border-gray-800 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-900 flex flex-col gap-1 transition-all"
                            >
                                <span className="flex items-center gap-1">⬛ TikTok Pixel</span>
                                <span className="text-[10px] text-gray-600 font-normal">Base + PageView</span>
                            </button>
                        </div>
                    </div>

                    {/* Head Script */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                Header Scripts <code>&lt;head&gt;</code>
                            </label>
                            <span className="text-[11px] text-gray-400 font-mono">{(brand.headScript || '').length} chars</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2">Injected in the <code>&lt;head&gt;</code> section of every page. Recommended for Meta Pixel base, Google Analytics, fonts, and meta scripts.</p>
                        <textarea 
                            value={brand.headScript || ''}
                            onChange={(e) => updateBrand('headScript', e.target.value)}
                            rows={6}
                            spellCheck={false}
                            className="w-full p-3 font-mono text-xs border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white bg-gray-50 text-gray-800 transition-all resize-y"
                            placeholder="<!-- Paste Meta Pixel, Google Tag (gtag.js), or custom head scripts here -->"
                        />
                    </div>
                    
                    {/* Body Script */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                Body Scripts <code>&lt;body&gt;</code>
                            </label>
                            <span className="text-[11px] text-gray-400 font-mono">{(brand.bodyScript || '').length} chars</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2">Injected just before <code>&lt;/body&gt;</code> on every page. Recommended for live chat widgets, non-blocking telemetry, or deferred scripts.</p>
                        <textarea 
                            value={brand.bodyScript || ''}
                            onChange={(e) => updateBrand('bodyScript', e.target.value)}
                            rows={5}
                            spellCheck={false}
                            className="w-full p-3 font-mono text-xs border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white bg-gray-50 text-gray-800 transition-all resize-y"
                            placeholder="<!-- Paste Live Chat widgets (Intercom, Crisp), body tracking scripts, or deferred tags here -->"
                        />
                    </div>
                </div>

                <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                    <span className="text-xs text-gray-500 font-medium">Changes auto-save with website theme settings</span>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
