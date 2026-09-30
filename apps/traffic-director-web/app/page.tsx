'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitFork, ShieldCheck, Zap, Globe, Smartphone, Activity, 
  ArrowRight, CheckCircle2, Lock, Terminal, Shield, RefreshCw,
  Server, Cpu, Play, Check, ChevronDown, Sparkles, ExternalLink,
  Sun, Moon, Users, Bot, Layers
} from 'lucide-react';
import { use180Identity } from '@workspace/identity-sdk';
import { getAuthToken } from '../lib/api';

export default function TrafficDirectorLandingPage() {
  const { launch180Identity, isOpeningIdentity } = use180Identity();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [activeSimulation, setActiveSimulation] = useState<'crawler' | 'shopper' | 'proxy'>('crawler');

  const handleLogin = () => {
    launch180Identity({
      clientId: '180-traffic-director',
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : undefined,
      onSuccess: (res: any) => {
        if (res?.token) {
          localStorage.setItem('platform_auth_token', res.token);
          document.cookie = `platform_auth_token=${res.token}; path=/; max-age=604800; SameSite=Lax`;
          window.location.href = '/traffic-director';
        }
      },
    });
  };

  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(Boolean(token));

    const storedTheme = localStorage.getItem('180_theme');
    const isDarkMode = storedTheme ? storedTheme === 'dark' : false;
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('180_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('180_theme', 'light');
    }
  };

  const simulationData = {
    crawler: {
      type: 'Ad Review Crawler Detected',
      action: 'Served Safe Page (Compliant Origin)',
      status: 'BLOCKED / CLOAKED',
      latency: '2.1 ms',
      statusColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      ip: '66.249.66.1 (Googlebot / Meta Inspector)',
      asn: 'AS32934 Facebook, Inc. (Datacenter)',
      browser: 'HeadlessChrome 128.0 (No Touch Screen)',
      destination: 'https://example-brand.com/privacy-safe-article.html',
      reason: 'Automated crawler signature matched ad review inspector pool.'
    },
    shopper: {
      type: 'Verified Real Shopper',
      action: 'Routed to Target Offer (Highest Conversion)',
      status: 'VERIFIED & ROUTED',
      latency: '3.4 ms',
      statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      ip: '73.189.44.12 (Residential Comcast, California US)',
      asn: 'AS7922 Comcast Cable (Residential ISP)',
      browser: 'Mobile Safari 17.5 • iPhone 15 Pro Max',
      destination: 'https://special-offer.checkout-deal.com/?src=fb_ad_781',
      reason: 'Touch points active, WebGL hardware verified, residential US mobile.'
    },
    proxy: {
      type: 'Datacenter VPN / Proxy Node',
      action: 'Firewall Dropped (Safe Fallback)',
      status: 'PROXY MITIGATED',
      latency: '1.8 ms',
      statusColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      ip: '162.55.101.44 (Hetzner Cloud, Germany)',
      asn: 'AS24940 Hetzner Online GmbH (Hosting Subnet)',
      browser: 'Python-Requests / Automated Tool',
      destination: 'https://example-brand.com/compliance-notice',
      reason: 'Known commercial datacenter ASN blacklisted by edge firewall.'
    }
  };

  const activeSim = simulationData[activeSimulation];

  const pillars = [
    {
      badge: "Sub-5ms Latency",
      badgeColor: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800",
      title: "Zero-Overhead Edge Traffic Evaluation",
      description: "Evaluate incoming clicks in under 5 milliseconds directly on the edge network before routing visitors to destination offers or safe pages.",
      bullets: [
        "Real-time IP, user-agent, and header fingerprinting",
        "Dynamic rule engine (Geo-location, device, ISP, referrer)",
        "Zero redirect lag preserving maximum ad quality scores"
      ]
    },
    {
      badge: "Anti-Fraud",
      badgeColor: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800",
      title: "Bot Shielding & Ad Review Cloaking",
      description: "Protect your ad spend from click fraud, competitor spy tools, and ad platform review bots. Serve clean compliance pages to crawlers and high-converting pages to real buyers.",
      bullets: [
        "Automated detection of Meta, Google, TikTok & crawler bots",
        "Dynamic shield endpoints (/shield/:slug) with fallback modes",
        "Protects ad accounts from aggressive false-positive bans"
      ]
    },
    {
      badge: "Universal Tag",
      badgeColor: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-800",
      title: "Dynamic Client Tag Injection & Verification",
      description: "Install one lightweight JS tag on external WordPress, Shopify, or Webflow landing pages to enable dynamic cloaking, headless lead capture, and visitor tracking.",
      bullets: [
        "One-line script tag (/tag/:slug) for external sites",
        "Automated tag installation verifier in dashboard",
        "Zero dependency on WordPress plugins or CMS code changes"
      ]
    },
    {
      badge: "Reverse Proxy",
      badgeColor: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800",
      title: "Seamless Clean Page Proxy Streaming",
      description: "Stream safe destination content directly through the edge proxy (/r/_proxy/stream) without domain redirects, preserving complete URL integrity for ad platforms.",
      bullets: [
        "In-memory stream proxying with real-time HTML rewriting",
        "Preserves original display URL for Facebook & Google Ads",
        "Custom HTTP header overrides & SSL masking"
      ]
    },
    {
      badge: "Attribution",
      badgeColor: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800",
      title: "Full-Funnel Click & Revenue Attribution",
      description: "Track every ad click from initial impression to closed CRM deal revenue. Identify the exact campaigns delivering real cash flow.",
      bullets: [
        "UTM, Click ID (fbclid, gclid, ttclid) auto-capture",
        "Postback webhook support for Meta CAPI & Google Offline",
        "Direct connection to 180 CRM Deals and Finance Invoices"
      ]
    },
    {
      badge: "Custom Domains",
      badgeColor: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200/60 dark:border-sky-800",
      title: "Automated Custom Domain Routing & SSL",
      description: "Deploy hundreds of tracking domains, custom shortlinks, and dynamic routing endpoints under your own branded CNAMEs with automatic Cloudflare SSL.",
      bullets: [
        "Unlimited custom CNAME routing domains",
        "Automated Cloudflare SSL provisioning in under 60 seconds",
        "Isolated routing rules per domain and campaign"
      ]
    }
  ];

  const playbookSteps = [
    {
      stepNumber: "01",
      title: "Create a Dynamic Link Campaign",
      description: "Navigate to Traffic Director → Create Link. Define your Campaign Slug, Safe Page URL (for bots/crawlers), and Offer Page URL (for real target visitors).",
      actionSnippet: "Traffic Director → Links → + New Link"
    },
    {
      stepNumber: "02",
      title: "Configure Evaluation & Bot Shield Rules",
      description: "Select your filtering criteria: allow target countries (e.g., US, UK, CA), block VPN/Datacenter IPs, and enable Automatic Ad Review Cloaking.",
      actionSnippet: "Rules: Block Crawlers = ON • Allow Mobile = ON"
    },
    {
      stepNumber: "03",
      title: "Deploy via Shortlink or Dynamic Tag",
      description: "Use the generated shortlink as your ad destination, or inject the 1-line dynamic script tag on your landing page.",
      actionSnippet: "<script src=\"https://api.180workspace.com/tag/offer-slug\"></script>"
    },
    {
      stepNumber: "04",
      title: "Monitor Real-Time Clicks & CRM Leads",
      description: "Watch live incoming traffic logs, blocked bot attempts, conversion rates, and automatically created deals in 180 CRM in real-time.",
      actionSnippet: "Live Stream • 0ms Latency • Instant Work Graph Sync"
    }
  ];

  const faqs = [
    {
      question: "What is Traffic Director and how does it protect my ad spend?",
      answer: "Traffic Director is an enterprise-grade edge routing and click evaluation engine. When someone clicks your ad, Traffic Director analyzes their IP, user-agent, and fingerprint in under 5ms. Real customers are instantly routed to your high-converting offer, while ad review crawlers, competitor spy tools, and click fraud bots are shown a compliant safe page."
    },
    {
      question: "Does Traffic Director slow down page load times for my real visitors?",
      answer: "No. Traffic Director runs directly on Cloudflare's global edge network across 300+ worldwide data centers. Evaluation takes less than 5 milliseconds, meaning your visitors experience instantaneous page loading with zero noticeable lag."
    },
    {
      question: "Can I use Traffic Director on existing WordPress, Shopify, or custom websites?",
      answer: "Yes. In addition to direct redirect links (/r/:slug), Traffic Director provides a 1-line dynamic JavaScript tag (/tag/:slug) that you can paste into Google Tag Manager, WordPress, Shopify, or Webflow headers without altering existing code."
    },
    {
      question: "How does Traffic Director handle Meta (Facebook), Google, and TikTok ad review bots?",
      answer: "Traffic Director maintains an active database of known ad platform review subnets, residential proxy exit nodes, and automated crawler signatures. Review bots are dynamically identified and served the clean, compliant safe page to prevent unjustified ad account suspensions."
    },
    {
      question: "Can I connect my own custom branded domains for tracking links?",
      answer: "Yes. You can connect unlimited custom domains (e.g., track.youragency.com) through our Company Hub. SSL certificates are provisioned automatically via Cloudflare with zero manual DNS configuration required after setting the initial CNAME record."
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* Background Gradients & Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern dark:bg-grid-pattern-dark [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-20" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[550px] w-[850px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-rose-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-[800px] right-0 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[130px]" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm group-hover:shadow-md transition-all">
                <img 
                  src={isDark ? "/white-icon.svg" : "/black-icon.svg"} 
                  alt="180workspace" 
                  className="w-5 h-5 object-contain" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  <span className="text-blue-600">180</span> Traffic Director
                </span>
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  EDGE V2
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#capabilities" className="hover:text-blue-600 dark:hover:text-white transition">Capabilities</a>
            <a href="#playbook" className="hover:text-blue-600 dark:hover:text-white transition">How It Works</a>
            <a href="#simulator" className="hover:text-blue-600 dark:hover:text-white transition">Live Simulator</a>
            <a href="#faqs" className="hover:text-blue-600 dark:hover:text-white transition">FAQs</a>
          </nav>

          {/* Actions & Theme Switcher */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {isAuthenticated ? (
              <Link
                href="/traffic-director"
                className="inline-flex items-center space-x-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isOpeningIdentity}
                className="inline-flex items-center space-x-2 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 px-5 py-2.5 text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isOpeningIdentity ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Sign In with 180 Identity</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        <div className="container mx-auto px-6 max-w-5xl text-center">
          
          {/* Eyebrow Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Sub-5ms Global Edge Execution • Cloudflare Anycast Network</span>
          </div>

          {/* H1 Display Title */}
          <h1 className="display-h1 max-w-4xl mx-auto mb-6">
            Ad Review Bot Shield &{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 bg-clip-text text-transparent">
              Smart Edge Traffic Router
            </span>
          </h1>

          {/* Lead Subtitle */}
          <p className="body-lead max-w-3xl mx-auto mb-10 text-slate-600 dark:text-slate-300">
            The ultimate conditional delivery engine for performance media buyers. Route real customers directly to your offer while seamlessly serving compliant safe pages to Meta, Google, and TikTok ad review crawlers with zero flicker.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {isAuthenticated ? (
              <Link
                href="/traffic-director"
                className="btn-primary w-full sm:w-auto text-base group"
              >
                <span>Launch Dashboard</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isOpeningIdentity}
                className="btn-primary w-full sm:w-auto text-base group"
              >
                <span>Launch with 180 Identity</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            <a
              href="#simulator"
              className="btn-secondary w-full sm:w-auto text-base group"
            >
              <Play className="mr-2 w-4 h-4 text-blue-600" />
              <span>Explore Shield Architecture</span>
            </a>
          </div>

          {/* Platform Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="px-4 py-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
              ⚡ Sub-5ms Anycast Latency
            </span>
            <span className="px-4 py-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
              🛡️ Zero Redirect Flicker
            </span>
            <span className="px-4 py-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
              🔓 100% Unlocked / Free Access
            </span>
          </div>

        </div>
      </section>

      {/* Interactive Live Routing Simulator Showcase */}
      <section id="simulator" className="py-12 md:py-20 max-w-6xl mx-auto px-6">
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl p-6 sm:p-10">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Terminal className="w-3.5 h-3.5" /> Interactive Edge Sandbox
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                Live Differential Routing Simulator
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Simulate how the Edge Decision Engine discriminates real shoppers from ad platform review crawlers.
              </p>
            </div>

            {/* Profile Selector Buttons */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/5">
              <button
                onClick={() => setActiveSimulation('crawler')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                  activeSimulation === 'crawler'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🤖 Meta Ad Crawler
              </button>
              <button
                onClick={() => setActiveSimulation('shopper')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                  activeSimulation === 'shopper'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                👤 Real US Shopper
              </button>
              <button
                onClick={() => setActiveSimulation('proxy')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                  activeSimulation === 'proxy'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🛡️ Datacenter Proxy
              </button>
            </div>
          </div>

          {/* Simulator Visualizer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 items-stretch">
            
            {/* Left: Input Telemetry Signals */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-950/60 p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Input Visitor Telemetry</span>
                <span className="font-mono text-blue-600">POST /api/v1/traffic-director/evaluate</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">IP & Network</span>
                  <p className="text-slate-900 dark:text-zinc-100 font-semibold truncate">{activeSim.ip}</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Autonomous System (ASN)</span>
                  <p className="text-slate-900 dark:text-zinc-100 font-semibold truncate">{activeSim.asn}</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">User-Agent & Hardware</span>
                  <p className="text-slate-900 dark:text-zinc-100 font-semibold truncate">{activeSim.browser}</p>
                </div>
              </div>
            </div>

            {/* Right: Evaluation Verdict */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/90 p-6 flex flex-col justify-between shadow-sm space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Decision Engine Verdict
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${activeSim.statusColor}`}>
                    {activeSim.status}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">
                  {activeSim.type}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  {activeSim.reason}
                </p>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200/60 dark:border-white/5 space-y-1 font-mono text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Routing Destination</span>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold truncate">
                    {activeSim.destination}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Evaluation Latency: <strong className="text-slate-900 dark:text-white font-mono">{activeSim.latency}</strong></span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> 0ms Redirect Lag
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Core Capabilities (6 Pillars from marketing-web) */}
      <section id="capabilities" className="py-20 md:py-28 bg-white/60 dark:bg-zinc-950/40 border-y border-slate-200/80 dark:border-white/10">
        <div className="container mx-auto px-6 max-w-6xl">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200/60 dark:border-blue-800">
              Core Capabilities
            </div>
            <h2 className="section-h2 mb-4">
              Enterprise-Grade Traffic Precision
            </h2>
            <p className="body-lead">
              Every tool performance advertisers need to eliminate ad account bans, cloak tracking links, and maximize conversion rates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {pillars.map((pillar, idx) => (
              <div 
                key={idx} 
                className="glass-card-interactive p-6 sm:p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${pillar.badgeColor}`}>
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="card-h3 mb-3 text-lg sm:text-xl">
                    {pillar.title}
                  </h3>

                  <p className="body-standard text-xs sm:text-sm mb-6">
                    {pillar.description}
                  </p>
                </div>

                <ul className="space-y-2.5 border-t border-slate-100 dark:border-white/10 pt-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {pillar.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4-Step Playbook ("How It Works") */}
      <section id="playbook" className="py-20 md:py-28 relative overflow-hidden">
        <div className="container mx-auto px-6 max-w-6xl">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-200/60 dark:border-purple-800">
              Step-by-Step Playbook
            </div>
            <h2 className="section-h2 mb-4">
              How It Works & Quickstart Guide
            </h2>
            <p className="body-lead">
              Deploy your first high-converting conditional Smart Link campaign in under 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {playbookSteps.map((step, idx) => (
              <div 
                key={idx}
                className="flex gap-5 bg-white dark:bg-zinc-900/80 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                  {step.stepNumber}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="body-standard text-xs sm:text-sm">
                    {step.description}
                  </p>
                  <div className="font-mono text-[11px] bg-slate-100 dark:bg-zinc-950 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 inline-block border border-slate-200 dark:border-white/10 font-medium">
                    {step.actionSnippet}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faqs" className="py-20 md:py-28 bg-white dark:bg-zinc-950 border-t border-slate-200/80 dark:border-white/10">
        <div className="container mx-auto px-6 max-w-4xl">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-200/60 dark:border-emerald-800">
              Got Questions?
            </div>
            <h2 className="section-h2 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="body-lead text-base sm:text-lg">
              Everything you need to know about setting up and scaling with 180 Traffic Director.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details 
                key={index}
                className="group bg-slate-50 dark:bg-zinc-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 transition-all duration-200 open:shadow-lg open:bg-white dark:open:bg-zinc-900 open:border-blue-200 dark:open:border-blue-800"
              >
                <summary className="flex items-center justify-between font-bold text-base sm:text-lg text-slate-900 dark:text-white cursor-pointer list-none select-none">
                  <span>{faq.question}</span>
                  <span className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0 transition-transform duration-200 group-open:rotate-180 group-open:bg-blue-600 group-open:text-white">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </summary>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* Bottom CTA Card */}
      <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto relative">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/70 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-blue-950/40 p-8 sm:p-14 lg:p-16 shadow-2xl text-center">
          
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-rose-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm mb-6">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Unlocked & Free For 180 Workspace Users
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white mb-6">
              Ready to shield your ad spend on the 180 Edge?
            </h2>

            <p className="body-lead text-base sm:text-lg max-w-2xl mx-auto mb-10">
              Eliminate account suspensions, competitor scraping, and wasted click spend. Route verified buyers directly to your offer with zero latency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              {isAuthenticated ? (
                <Link
                  href="/traffic-director"
                  className="btn-primary w-full"
                >
                  <span>Go to Traffic Director Dashboard</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isOpeningIdentity}
                  className="btn-primary w-full"
                >
                  <span>Launch with 180 Identity</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <img 
              src={isDark ? "/white-icon.svg" : "/black-icon.svg"} 
              alt="180workspace" 
              className="w-5 h-5 object-contain" 
            />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              180 Traffic Director EDGE
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
            <Link href="/traffic-director/links" className="hover:text-blue-600 transition">Smart Links</Link>
            <Link href="/traffic-director/analytics" className="hover:text-blue-600 transition">Analytics</Link>
            <Link href="/traffic-director/logs" className="hover:text-blue-600 transition">Traffic Logs</Link>
            <Link href="/traffic-director/simulator" className="hover:text-blue-600 transition">Simulator</Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Anycast Edge Operational</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
