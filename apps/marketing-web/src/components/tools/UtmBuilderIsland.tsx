import React, { useState, useEffect, useRef } from 'react';

interface Preset {
  name: string;
  source: string;
  medium: string;
}

const PRESETS: Preset[] = [
  { name: 'Google Search Ads', source: 'google', medium: 'cpc' },
  { name: 'Facebook / Meta', source: 'facebook', medium: 'paid_social' },
  { name: 'LinkedIn Campaign', source: 'linkedin', medium: 'social' },
  { name: 'TikTok Ads', source: 'tiktok', medium: 'video_ad' },
  { name: 'Twitter / X', source: 'twitter', medium: 'tweet' },
  { name: 'Email Newsletter', source: 'newsletter', medium: 'email' },
];

export default function UtmBuilderIsland() {
  const [baseUrl, setBaseUrl] = useState('https://yourdomain.com/landing-page');
  const [source, setSource] = useState('google');
  const [medium, setMedium] = useState('cpc');
  const [campaign, setCampaign] = useState('q3_growth_campaign');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('hero_cta_button');

  const [finalUrl, setFinalUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // QR Code Settings
  const [qrColorDark, setQrColorDark] = useState('#0f172a');
  const [qrColorLight, setQrColorLight] = useState('#ffffff');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Build the final sanitized UTM URL
  useEffect(() => {
    try {
      let trimmedBase = baseUrl.trim();
      if (!trimmedBase) {
        setFinalUrl('');
        return;
      }

      if (!trimmedBase.startsWith('http://') && !trimmedBase.startsWith('https://')) {
        trimmedBase = 'https://' + trimmedBase;
      }

      const url = new URL(trimmedBase);

      if (source.trim()) url.searchParams.set('utm_source', source.trim());
      if (medium.trim()) url.searchParams.set('utm_medium', medium.trim());
      if (campaign.trim()) url.searchParams.set('utm_campaign', campaign.trim());
      if (term.trim()) url.searchParams.set('utm_term', term.trim());
      if (content.trim()) url.searchParams.set('utm_content', content.trim());

      setFinalUrl(url.toString());
    } catch {
      setFinalUrl(baseUrl);
    }
  }, [baseUrl, source, medium, campaign, term, content]);

  // Generate QR Code dynamically
  useEffect(() => {
    if (!finalUrl || typeof window === 'undefined') return;

    import('qrcode')
      .then((QRCodeModule) => {
        const QRCode = QRCodeModule.default || QRCodeModule;
        QRCode.toDataURL(finalUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: qrColorDark,
            light: qrColorLight,
          },
          errorCorrectionLevel: 'H',
        })
          .then((url: string) => {
            setQrDataUrl(url);
          })
          .catch((err: any) => {
            console.error('QR code generation error:', err);
          });
      })
      .catch((err) => {
        console.error('Failed to load QRCode library:', err);
      });
  }, [finalUrl, qrColorDark, qrColorLight]);

  const applyPreset = (p: Preset) => {
    setSource(p.source);
    setMedium(p.medium);
  };

  const copyToClipboard = () => {
    if (!finalUrl) return;
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `campaign-qrcode-${campaign || 'utm'}.png`;
    link.click();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* 1-Click Platform Presets */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
        <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-3">
          1-Click Traffic Platform Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                source === p.source && medium === p.medium
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: UTM Input Fields */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Campaign Parameters
          </h3>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Website URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://yourwebsite.com/page"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Campaign Source (<span className="font-mono">utm_source</span>) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. google, facebook, newsletter"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Campaign Medium (<span className="font-mono">utm_medium</span>) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="e.g. cpc, banner, email, social"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Campaign Name (<span className="font-mono">utm_campaign</span>)
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. spring_launch"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Campaign Term (<span className="font-mono">utm_term</span>)
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. b2b+crm"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Campaign Content (<span className="font-mono">utm_content</span>)
              </label>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g. hero_cta_btn"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Generated Result URL Box */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Generated Campaign URL
            </label>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
              {finalUrl || 'Enter a valid URL above to build tracking parameters.'}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    <span>Copy URL</span>
                  </>
                )}
              </button>

              <a
                href={finalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Test Link ↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Dynamic QR Code Generator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              Campaign QR Code
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time scannable QR code for print, billboards & event marketing.
            </p>

            {/* QR Preview Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Campaign QR Code"
                  className="w-48 h-48 rounded-xl object-contain shadow-sm"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  Building QR Code...
                </div>
              )}
            </div>

            {/* QR Customization Colors */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  QR Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrColorDark}
                    onChange={(e) => setQrColorDark(e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                  />
                  <span className="font-mono text-xs">{qrColorDark}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrColorLight}
                    onChange={(e) => setQrColorLight(e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                  />
                  <span className="font-mono text-xs">{qrColorLight}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadQrCode}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Download High-Res QR Code</span>
          </button>
        </div>
      </div>

      {/* The 180workspace Funnel CTA */}
      <div className="mt-12 rounded-3xl p-8 bg-gradient-to-r from-rose-900 to-red-950 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-rose-300">
              Enterprise Traffic Governance
            </span>
            <h4 className="text-2xl md:text-3xl font-black">
              Need Dynamic URL Cloaking & Bot Shielding?
            </h4>
            <p className="text-sm text-rose-200 max-w-xl">
              180workspace Traffic Director protects your paid ad spend from bot clicks, provides real-time geo-routing, and delivers sub-millisecond edge redirects.
            </p>
          </div>
          <a
            href="https://app.180workspace.com/signup"
            className="px-8 py-4 rounded-full bg-white text-rose-950 font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shrink-0"
          >
            Explore Traffic Director →
          </a>
        </div>
      </div>
    </div>
  );
}
