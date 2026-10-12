'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, Bot, Smartphone, Megaphone, Activity, Play, Pause,
  ArrowRight, CheckCircle2, Lock, ShieldCheck, Zap, Globe, Sparkles,
  Users, Radio, DollarSign, Wallet, Clock, Headphones, Mic, BarChart3,
  Sun, Moon, ExternalLink, ChevronRight, Check, Volume2, Flame
} from 'lucide-react';
import { use180Identity } from '@workspace/identity-sdk';
import { getAuthToken } from '../lib/api';

export default function VoiceforceLandingPage() {
  const { launch180Identity, isOpeningIdentity } = use180Identity();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  
  // Interactive Voice Demo State
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<'inbound' | 'outbound' | 'appointment'>('inbound');

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_180_CLIENT_ID || '180_client_70d751541f05347fe803ec8e128f5e83';
    launch180Identity({
      clientId,
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : undefined,
      onSuccess: (res: any) => {
        const token = res?.authToken || res?.accessToken || res?.token;
        if (token) {
          localStorage.setItem('platform_auth_token', token);
          localStorage.setItem('token', token);
          const isProd = window.location.protocol === 'https:';
          const is180 = window.location.hostname.endsWith('180workspace.com');
          const domainAttr = is180 ? '; domain=.180workspace.com' : '';
          const secureAttr = isProd ? '; Secure' : '';
          document.cookie = `platform_auth_token=${token}; path=/; max-age=604800; SameSite=Lax${secureAttr}${domainAttr}`;
          if (res?.user) {
            localStorage.setItem('user', JSON.stringify(res.user));
          }
          window.location.href = '/voiceforce';
        }
      },
    });
  };

  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(Boolean(token));

    const storedTheme = localStorage.getItem('180_theme');
    const isDarkMode = storedTheme ? storedTheme === 'dark' : true;
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

  const voices = [
    {
      id: 'maya-support',
      name: 'Maya — Empathy Support',
      persona: 'Empathetic Customer Success Specialist',
      provider: 'Cartesia Sonic',
      accent: 'Neutral English',
      sampleText: 'Hi there! I see your order #1084 is currently out for delivery. Would you like me to share the live tracking link?',
    },
    {
      id: 'alex-sales',
      name: 'Alex — High-Impact Sales',
      persona: 'Strategic B2B SDR & Lead Qualifier',
      provider: 'Cartesia Sonic',
      accent: 'North American',
      sampleText: 'Good afternoon! Following up on your pricing inquiry for our enterprise voice platform. Do you have 2 minutes to discuss volume discounts?',
    },
    {
      id: 'priya-booking',
      name: 'Priya — Clinical Scheduler',
      persona: 'Patient Concierge & Calendar Dispatcher',
      provider: 'ElevenLabs Multilingual',
      accent: 'Indian English',
      sampleText: 'Namaste! Dr. Sharma has open consultations this Thursday at 3:30 PM. Shall I confirm your appointment?',
    },
  ];

  const scenarioData = {
    inbound: {
      title: 'Inbound Customer Reception & Tier-1 Support',
      human: {
        holdTime: '18 minutes avg on hold',
        cost: '₹55.00 per ticket handled',
        sync: 'Delayed manual agent notes',
        scaling: 'Limited to physical shift headcount',
      },
      ai: {
        holdTime: 'Instant 400ms pickup',
        cost: '₹6.00 / minute strictly prepaid',
        sync: '100% real-time transcript & CRM sync',
        scaling: 'Scales to 10,000+ simultaneous callers',
      },
    },
    outbound: {
      title: 'High-Volume Order Confirmation & Verification',
      human: {
        holdTime: '35 dials / hour max per rep',
        cost: 'High fixed salary overhead',
        sync: 'Human error in disposition logging',
        scaling: 'Requires hiring seasonal call staff',
      },
      ai: {
        holdTime: '1,200 dials / minute capacity',
        cost: 'Zero fixed cost — pay per second',
        sync: 'Automated order tag status updates',
        scaling: 'Runs flash holiday surges effortlessly',
      },
    },
    appointment: {
      title: 'Calendar Booking & Proactive Appointment Reminders',
      human: {
        holdTime: '40% missed calls go to voicemail',
        cost: 'High administrative friction',
        sync: 'Back-and-forth email scheduling',
        scaling: 'Busy signals during rush hours',
      },
      ai: {
        holdTime: 'Zero missed calls 24/7/365',
        cost: 'Dramatically reduced no-show rate',
        sync: 'Direct Google / Outlook Calendar lock',
        scaling: 'Automatic SMS & WhatsApp confirmations',
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080a] text-gray-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-gray-200/80 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
                180 <span className="bg-gradient-to-r from-cyan-500 to-indigo-400 bg-clip-text text-transparent">Voiceforce</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
                Autonomous AI Voice Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Capabilities</a>
            <a href="#simulator" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Benchmark Lab</a>
            <a href="#voices" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Voice Catalog</a>
            <a href="#wallet" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Prepaid Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            {isAuthenticated ? (
              <Link
                href="/voiceforce"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-indigo-500 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
              >
                <span>Console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isOpeningIdentity}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isOpeningIdentity ? 'Opening 180 Identity...' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl opacity-70 dark:opacity-40" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-6">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-500" />
            <span>ENTERPRISE ULTRA-LOW LATENCY TELEPHONY • 400MS SPEECH-TO-SPEECH</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 dark:text-white max-w-5xl mx-auto leading-[1.1]">
            Deploy Empathetic AI Voice Employees That{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 bg-clip-text text-transparent">
              Answer, Sell & Confirm
            </span>{' '}
            at Scale
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Eliminate customer hold times forever. 180 Voiceforce connects ultra-realistic voice models directly to carrier phone numbers, CRM customer records, and enterprise product catalogs.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Zap className="w-5 h-5" />
              <span>Launch Voiceforce Console</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <a
              href="#simulator"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-zinc-200 font-semibold text-base hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-cyan-500" />
              <span>Inspect Benchmark Simulation</span>
            </a>
          </div>

          {/* Key Metrics Counter Strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 backdrop-blur-md">
              <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">0.40s</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">Turnaround Latency</div>
            </div>
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 backdrop-blur-md">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹6.00</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">Per-Minute Calling</div>
            </div>
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 backdrop-blur-md">
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">10,000+</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">Concurrent Channels</div>
            </div>
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 backdrop-blur-md">
              <div className="text-3xl font-black text-purple-600 dark:text-purple-400">99.98%</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">Carrier Carrier SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Audio Waveform Interactive Preview Bar */}
      <section id="voices" className="py-16 bg-white dark:bg-[#0c0d11] border-y border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
              State-of-the-Art Neural Audio
            </h2>
            <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              Studio-Quality Voices with Human Intonation & Empathy
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Powered by high-throughput Cartesia Sonic & ElevenLabs streaming architectures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {voices.map((voice) => {
              const isCurrentPlaying = playingVoice === voice.id;
              return (
                <div
                  key={voice.id}
                  className="p-6 rounded-2xl bg-slate-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        {voice.provider}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                        {voice.accent}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{voice.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{voice.persona}</p>

                    <div className="my-5 p-3.5 rounded-xl bg-white dark:bg-zinc-900/80 border border-gray-200/70 dark:border-white/5 text-xs text-gray-700 dark:text-zinc-300 italic">
                      "{voice.sampleText}"
                    </div>
                  </div>

                  {/* Waveform Bar & Play Simulation */}
                  <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-end gap-1 h-6">
                      {[12, 22, 16, 28, 14, 20, 26, 15, 24, 18].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: isCurrentPlaying ? `${h}px` : '6px' }}
                          className={`w-1 rounded-full transition-all duration-300 ${
                            isCurrentPlaying ? 'bg-cyan-500 animate-voice-bar' : 'bg-gray-300 dark:bg-zinc-700'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setPlayingVoice(isCurrentPlaying ? null : voice.id)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCurrentPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen Sample</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Benchmark Simulator Lab */}
      <section id="simulator" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
              Live Comparative Lab
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              Traditional Human Call Center vs. 180 Voiceforce AI
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Select an enterprise scenario to inspect real-world operational economics and latency.
            </p>
          </div>

          {/* Scenario Tabs */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {(['inbound', 'outbound', 'appointment'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setActiveScenario(sc)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeScenario === sc
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30'
                }`}
              >
                {sc === 'inbound' && 'Customer Inbound Support'}
                {sc === 'outbound' && 'Outbound Sales Campaigns'}
                {sc === 'appointment' && 'Calendar & Booking Dispatch'}
              </button>
            ))}
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Traditional BPO */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0f14] border border-red-500/20 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Legacy Approach</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Human Call Center / BPO</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Headphones className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">Hold & Pickup Time</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {scenarioData[activeScenario].human.holdTime}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">Unit Cost per Resolution</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {scenarioData[activeScenario].human.cost}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">CRM & Notes Synchronization</div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mt-0.5">
                    {scenarioData[activeScenario].human.sync}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">Spike Concurrency</div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mt-0.5">
                    {scenarioData[activeScenario].human.scaling}
                  </div>
                </div>
              </div>
            </div>

            {/* 180 Voiceforce */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-cyan-950/20 via-black/40 to-black/60 dark:bg-[#0c1015] border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-cyan-500 text-black font-extrabold text-[10px] tracking-wider uppercase">
                Enterprise Recommended
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Sovereign Voiceforce</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Autonomous Voice Agent</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Bot className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase">Hold & Pickup Time</div>
                  <div className="text-base font-bold text-cyan-500 dark:text-cyan-300 mt-0.5">
                    {scenarioData[activeScenario].ai.holdTime}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Unit Cost per Resolution</div>
                  <div className="text-base font-bold text-emerald-500 dark:text-emerald-300 mt-0.5">
                    {scenarioData[activeScenario].ai.cost}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">CRM & Notes Synchronization</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">
                    {scenarioData[activeScenario].ai.sync}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">Spike Concurrency</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">
                    {scenarioData[activeScenario].ai.scaling}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section id="features" className="py-20 bg-white dark:bg-[#0a0b0e] border-y border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
              Full Telephony Stack
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              Everything Your Voice Operation Needs
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Built on resilient carrier telephony, direct DID provisioning, and sub-second speech synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-5">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Carrier DIDs & Number Leases</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                Lease dedicated virtual telephone numbers (₹149/mo) with instant carrier provisioning, inbound routing, and STIR/SHAKEN caller verification.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">High-Throughput Outbound Campaigns</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                Upload lead or customer lists and dial thousands of contacts with intelligent pacing, voicemail detection, and retry rules.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Call Forwarding & Hunt Queues</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                Seamlessly transfer calls to human specialists if sentiment drops, or orchestrate tiered ring groups and out-of-hours coverage.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Enterprise RAG Knowledge Brain</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                Connect your documentation, order status APIs, and return policies directly to agent system prompts for zero hallucination.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Browser WebRTC Softphone Test Bench</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                Test your AI voice employees instantly directly in your browser without burning carrier telephony balance. Fine-tune prompts in real time.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Guardrails & Compliance Auditing</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                Enforce conversational compliance, prevent jailbreaks, mask sensitive PII/payment data, and inspect full sentiment scorecards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Prepaid Wallet Showcase Section */}
      <section id="wallet" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-indigo-950/30 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold mb-4">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>TRANSPARENT SOVEREIGN TELEPHONY WALLET</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  Pay Only for What You Speak. Zero Surprises.
                </h2>

                <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Every minute of AI phone calling is debited directly from your dedicated prepaid telephony wallet. Top up with 1-click via 180 Pay Sovereign Checkout, set auto-recharge thresholds, and download GST tax receipts instantly.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Flat <strong>₹6.00 / minute</strong> call rate (or $0.07 / min USD)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Number leases at <strong>₹149 / month</strong> with auto-renewal safeguard</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Automated auto-refill rules when balance drops below ₹200</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>1-Click top-up via 180 Pay UPI, Cards, NetBanking & Corporate Credit</span>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleLogin}
                    className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                  >
                    Manage Voiceforce Wallet
                  </button>
                </div>
              </div>

              {/* Mockup Card */}
              <div className="p-6 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400 uppercase font-semibold">Prepaid Telephony Balance</div>
                      <div className="text-2xl font-black text-white">₹2,450.00</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                    Active & Calling
                  </span>
                </div>

                <div className="py-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Estimated Minutes Remaining</span>
                    <span className="font-bold text-white">~408 Minutes</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Auto-Recharge Rule</span>
                    <span className="font-semibold text-cyan-400">Auto-Refill ₹1,000 when &lt; ₹200</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Active Phone Numbers</span>
                    <span className="font-bold text-white">2 DIDs Leased</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex gap-2">
                  <button
                    onClick={handleLogin}
                    className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Instant Top-Up
                  </button>
                  <button
                    onClick={handleLogin}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                  >
                    View Tax Invoices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <footer className="py-16 bg-white dark:bg-black border-t border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            Ready to Build Your Autonomous AI Voice Workforce?
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400 max-w-xl mx-auto">
            Get started in minutes. Connect your numbers, customize your prompt guardrails, and start receiving calls with 180 Voiceforce.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleLogin}
              className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/25 transition-all cursor-pointer"
            >
              Sign In with 180 Identity
            </button>
          </div>
          <div className="mt-12 text-xs text-gray-400 dark:text-zinc-600">
            &copy; {new Date().getFullYear()} 180 Workspace Inc. All rights reserved. 180 Voiceforce is an official product of 180 Workspace.
          </div>
        </div>
      </footer>
    </div>
  );
}
