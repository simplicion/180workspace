import React, { useState, useEffect } from 'react';

interface TranscriptSegment {
  start: number;
  dur: number;
  text: string;
  timestamp: string;
}

interface TranscriptData {
  videoId: string;
  title: string;
  author: string;
  language: string;
  wordCount: number;
  segmentsCount: number;
  segments: TranscriptSegment[];
  fullText: string;
}

const SAMPLE_VIDEOS = [
  {
    title: 'Steve Jobs 2005 Stanford Speech',
    url: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc',
    id: 'UF8uR6Z6KLc',
    author: 'Stanford University',
    language: 'English (US)',
    sampleSegments: [
      { start: 0, dur: 5.2, timestamp: '00:00', text: 'I am honored to be with you today at your commencement from one of the finest universities in the world.' },
      { start: 5.5, dur: 4.8, timestamp: '00:05', text: 'Truth be told, I never graduated from college. This is the closest I\'ve ever gotten to a college graduation.' },
      { start: 10.5, dur: 6.2, timestamp: '00:10', text: 'Today I want to tell you three stories from my life. That\'s it. No big deal. Just three stories.' },
      { start: 17.0, dur: 5.5, timestamp: '00:17', text: 'The first story is about connecting the dots. I dropped out of Reed College after the first 6 months.' },
      { start: 23.0, dur: 6.0, timestamp: '00:23', text: 'You can\'t connect the dots looking forward; you can only connect them looking backwards.' },
      { start: 29.5, dur: 5.8, timestamp: '00:29', text: 'So you have to trust that the dots will somehow connect in your future.' },
      { start: 35.5, dur: 6.5, timestamp: '00:35', text: 'Your time is limited, so don\'t waste it living someone else\'s life.' },
      { start: 42.5, dur: 5.0, timestamp: '00:42', text: 'Stay Hungry. Stay Foolish.' }
    ]
  },
  {
    title: 'Rick Astley - Never Gonna Give You Up',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    id: 'dQw4w9WgXcQ',
    author: 'Rick Astley Official',
    language: 'English (UK)',
    sampleSegments: [
      { start: 18.5, dur: 4.5, timestamp: '00:18', text: 'We\'re no strangers to love' },
      { start: 23.0, dur: 4.2, timestamp: '00:23', text: 'You know the rules and so do I' },
      { start: 27.5, dur: 4.5, timestamp: '00:27', text: 'A full commitment\'s what I\'m thinking of' },
      { start: 32.0, dur: 4.5, timestamp: '00:32', text: 'You wouldn\'t get this from any other guy' },
      { start: 42.5, dur: 3.5, timestamp: '00:42', text: 'Never gonna give you up' },
      { start: 46.0, dur: 3.5, timestamp: '00:46', text: 'Never gonna let you down' },
      { start: 49.5, dur: 4.0, timestamp: '00:49', text: 'Never gonna run around and desert you' }
    ]
  }
];

export default function YouTubeSuiteIsland() {
  const [activeTab, setActiveTab] = useState<'transcript' | 'thumbnails'>('transcript');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [data, setData] = useState<TranscriptData | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Extract YouTube ID from any standard URL
  const parseVideoId = (input: string): string | null => {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (parsed.hostname.includes('youtube.com')) {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

        const pathParts = parsed.pathname.split('/').filter(Boolean);
        if (['shorts', 'embed', 'v', 'live'].includes(pathParts[0])) {
          if (pathParts[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])) return pathParts[1];
        }
      } else if (parsed.hostname.includes('youtu.be')) {
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        if (pathParts[0] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) return pathParts[0];
      }
    } catch {
      // Fall through to regex
    }

    const match = trimmed.match(/(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  // Instant ID detection as user types or pastes
  useEffect(() => {
    const id = parseVideoId(urlInput);
    if (id) {
      setVideoId(id);
      setError(null);
    }
  }, [urlInput]);

  const loadSample = (sample: typeof SAMPLE_VIDEOS[0]) => {
    setUrlInput(sample.url);
    setVideoId(sample.id);
    setError(null);
    setVideoTitle(sample.title);
    const fullText = sample.sampleSegments.map((s) => s.text).join(' ');
    setData({
      videoId: sample.id,
      title: sample.title,
      author: sample.author,
      language: sample.language,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      segmentsCount: sample.sampleSegments.length,
      segments: sample.sampleSegments,
      fullText
    });
    setActiveTab('transcript');
  };

  const handleFetch = async (e?: React.FormEvent, customId?: string) => {
    if (e) e.preventDefault();
    setError(null);

    const id = customId || parseVideoId(urlInput);
    if (!id) {
      setError('Please enter a valid YouTube Video or Shorts URL.');
      return;
    }

    setVideoId(id);

    // Check if it's one of our built-in sample videos
    const sample = SAMPLE_VIDEOS.find((s) => s.id === id);
    if (sample) {
      loadSample(sample);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/public/tools/youtube-transcript?url=${encodeURIComponent(id)}`);
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error('Could not connect to transcript service. Please check your network connection.');
      }

      if (json.title) {
        setVideoTitle(json.title);
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'No spoken transcript found on YouTube for this video. Captions are only generated for videos with spoken dialogue.');
      }

      setData(json);
      setActiveTab('transcript');
    } catch (err: any) {
      setError(err.message || 'No spoken transcript found for this video.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!data) return;
    const textToCopy = showTimestamps
      ? data.segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n')
      : data.fullText;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!data) return;
    const text = showTimestamps
      ? data.segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n')
      : data.fullText;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.videoId}-transcript.txt`;
    link.click();
  };

  const handleDownloadSrt = () => {
    if (!data) return;
    let srt = '';
    data.segments.forEach((seg, i) => {
      const startMs = Math.round(seg.start * 1000);
      const endMs = Math.round((seg.start + seg.dur) * 1000);

      const formatSrtTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const milli = ms % 1000;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(milli).padStart(3, '0')}`;
      };

      srt += `${i + 1}\n${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n${seg.text}\n\n`;
    });

    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.videoId}-subtitles.srt`;
    link.click();
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(data.title.substring(0, 70), 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Channel: ${data.author} | Words: ${data.wordCount} | Language: ${data.language}`, 14, 28);
      doc.text(`Exported from 180workspace YouTube Suite (https://180workspace.com/tools)`, 14, 34);

      doc.setDrawColor(220, 220, 220);
      doc.line(14, 38, 196, 38);

      doc.setFontSize(10);
      doc.setTextColor(30);

      let y = 46;
      const pageHeight = doc.internal.pageSize.getHeight();

      data.segments.forEach((seg) => {
        const line = showTimestamps ? `[${seg.timestamp}] ${seg.text}` : seg.text;
        const splitLines = doc.splitTextToSize(line, 180);

        if (y + splitLines.length * 6 > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }

        doc.text(splitLines, 14, y);
        y += splitLines.length * 6 + 2;
      });

      doc.save(`${data.videoId}-transcript.pdf`);
    } catch (err) {
      console.error('Transcript PDF export error:', err);
    }
  };

  const downloadImageDirectly = async (imageUrl: string, filename: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => {
        window.open(imageUrl, '_blank');
      };
      img.src = imageUrl;
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredSegments = data?.segments.filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Tool Navigation Tabs */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('transcript');
            if (videoId && !data) handleFetch(undefined, videoId);
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'transcript'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Transcript Extractor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('thumbnails')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'thumbnails'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>4K Thumbnail Grabber</span>
        </button>
      </div>

      {/* Main Input Box */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-900/5">
        <form onSubmit={handleFetch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste any YouTube URL (e.g. https://www.youtube.com/watch?v=... or youtu.be/...)"
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm md:text-base transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !urlInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm md:text-base shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{activeTab === 'transcript' ? 'Get Transcript' : 'View Thumbnails'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Speech Demos */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-bold">✨ Test 1-Click Speech Demos:</span>
          {SAMPLE_VIDEOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSample(s)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* DETECTED VIDEO DASHBOARD (Instantly visible whenever a valid URL is in the box) */}
      {videoId && (
        <div className="space-y-6">
          {/* Quick Status / Mode Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-mono font-bold text-xs">
                ▶
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {videoTitle || (data ? data.title : `YouTube Video: ${videoId}`)}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  ID: {videoId} • {data ? `${data.wordCount} words • ${data.language}` : '4K Thumbnails Ready'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('thumbnails');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'thumbnails'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                🖼️ Thumbnails Gallery
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transcript');
                  if (!data) handleFetch(undefined, videoId);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'transcript'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                📝 Full Transcript
              </button>
            </div>
          </div>

          {/* NOTICE WHEN VIDEO HAS NO CAPTIONS */}
          {error && activeTab === 'transcript' && !data && (
            <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold">
                  ℹ️
                </div>
                <div>
                  <h5 className="text-sm font-black text-amber-900 dark:text-amber-200">
                    No Spoken Dialogue Track on YouTube for this Video
                  </h5>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                    This video is an ambient meditation, music, or instrumental audio track without spoken speech dialogue on YouTube.
                    All high-resolution 1080p, 720p, and 480p thumbnails are available below!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW A: TRANSCRIPT EXTRACTOR VIEW (When data exists) */}
          {activeTab === 'transcript' && data && (
            <div className="space-y-6">
              {/* Transcript Export Bar */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Search in transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      {copied ? '✓ Copied' : '📋 Copy Text'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      .TXT
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      .SRT
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      📄 Export PDF
                    </button>
                  </div>
                </div>

                {/* Transcript Segments Box */}
                <div className="max-h-[480px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {filteredSegments.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      No matching transcript segments found.
                    </div>
                  ) : (
                    filteredSegments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        {showTimestamps && (
                          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded shrink-0">
                            {seg.timestamp}
                          </span>
                        )}
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                          {seg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: 4K THUMBNAILS GALLERY (Always accessible & active on thumbnails tab or if no transcript) */}
          {(activeTab === 'thumbnails' || (!data && error)) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    High-Resolution YouTube Thumbnails
                  </h4>
                  <p className="text-xs text-slate-500">
                    Direct 1-click downloads & full resolution preview for <span className="font-mono font-bold text-indigo-600">{videoId}</span>
                  </p>
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open on YouTube ↗
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1080p MaxRes */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                        Full HD (1080p / 1920x1080)
                      </span>
                      <span className="text-xs text-slate-400 font-mono">maxresdefault.jpg</span>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-4 group">
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt="1080p thumbnail"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e: any) => {
                          e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => downloadImageDirectly(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, `${videoId}-maxres-1080p.jpg`)}
                      className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      <span>Download 1080p</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyImageUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)}
                      className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedUrl === `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` ? '✓ Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* 720p HQ */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                        High Quality (720p / 1280x720)
                      </span>
                      <span className="text-xs text-slate-400 font-mono">hqdefault.jpg</span>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-4 group">
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                        alt="720p thumbnail"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => downloadImageDirectly(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, `${videoId}-hq-720p.jpg`)}
                      className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      <span>Download 720p</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyImageUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)}
                      className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedUrl === `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` ? '✓ Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* 480p SD */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-900">
                        Standard (480p / 640x480)
                      </span>
                      <span className="text-xs text-slate-400 font-mono">sddefault.jpg</span>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-4 group">
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/sddefault.jpg`}
                        alt="480p thumbnail"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => downloadImageDirectly(`https://img.youtube.com/vi/${videoId}/sddefault.jpg`, `${videoId}-sd-480p.jpg`)}
                      className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      <span>Download 480p</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyImageUrl(`https://img.youtube.com/vi/${videoId}/sddefault.jpg`)}
                      className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedUrl === `https://img.youtube.com/vi/${videoId}/sddefault.jpg` ? '✓ Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* Player Embed */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                        HD Player Preview
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Live Video</span>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 mb-4">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                        title="YouTube Video Player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-400 font-mono">
                      Embedded YouTube Video ID: {videoId}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The 180workspace Funnel CTA */}
      <div className="mt-12 rounded-3xl p-8 bg-gradient-to-r from-indigo-900 to-violet-950 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
              Upgrade Your Content Workflow
            </span>
            <h4 className="text-2xl md:text-3xl font-black">
              Turn YouTube Videos into Omnichannel Campaigns
            </h4>
            <p className="text-sm text-indigo-200 max-w-xl">
              180workspace Social Media CRM connects with your content calendar, auto-schedules posts, and tracks engagement across LinkedIn, YouTube, Twitter & TikTok.
            </p>
          </div>
          <a
            href="https://app.180workspace.com/signup"
            className="px-8 py-4 rounded-full bg-white text-indigo-950 font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shrink-0"
          >
            Try 180workspace Free →
          </a>
        </div>
      </div>
    </div>
  );
}


