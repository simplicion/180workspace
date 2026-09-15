'use strict';

import { Request, Response } from 'express';
import { getCache, setCache } from '../../../system-configs/utils/redis';

interface TranscriptSegment {
  start: number;
  dur: number;
  text: string;
  timestamp: string;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract YouTube Video ID from various URL formats
 */
export function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'shorts' || pathParts[0] === 'embed' || pathParts[0] === 'v') {
        if (pathParts[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])) return pathParts[1];
      }
    } else if (parsed.hostname.includes('youtu.be')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) return pathParts[0];
    }
  } catch {
    // Fall through to regex
  }

  const match = trimmed.match(/(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Decode HTML entities like &amp;, &#39;, &quot;, etc.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch and parse YouTube transcript without external heavy libraries
 */
export async function getYouTubeTranscript(req: Request, res: Response) {
  try {
    const { url, lang = 'en' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid YouTube URL or Video ID is required.'
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'Could not parse a valid YouTube Video ID from the provided URL.'
      });
    }

    // Check Redis cache (24-hour cache)
    const cacheKey = `public:yt:transcript:${videoId}:${lang}`;
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          cached: true,
          ...cached
        });
      }
    } catch (cacheErr) {
      console.warn(`[Redis Cache] read error for ${cacheKey}:`, cacheErr);
    }

    // Fetch YouTube watch page HTML
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: 'Unable to reach YouTube to retrieve video data.'
      });
    }

    const html = await response.text();

    // Extract title from HTML
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : `YouTube Video (${videoId})`;
    title = decodeHtmlEntities(title);

    // Extract ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/s)
      || html.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s);

    if (!playerResponseMatch) {
      return res.status(404).json({
        success: false,
        videoId,
        title,
        message: 'Video not found or ytInitialPlayerResponse could not be parsed. The video might be private or restricted.'
      });
    }

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Failed to parse YouTube player data.'
      });
    }

    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return res.status(404).json({
        success: false,
        videoId,
        title,
        message: 'No transcript or subtitles available for this video. Captions may be disabled by the creator.'
      });
    }

    // Try all available caption tracks
    let segments: TranscriptSegment[] = [];
    let chosenTrack = captionTracks[0];

    for (const track of captionTracks) {
      if (!track.baseUrl) continue;
      chosenTrack = track;

      try {
        // Try json3 format first
        const transcriptRes = await fetch(track.baseUrl + '&fmt=json3');
        if (transcriptRes.ok) {
          const textData = await transcriptRes.text();
          if (textData && textData.trim().length > 0) {
            const jsonData = JSON.parse(textData);
            if (jsonData.events && Array.isArray(jsonData.events)) {
              segments = jsonData.events
                .filter((e: any) => e.segs && e.segs.length > 0)
                .map((e: any) => {
                  const startSec = (e.tStartMs || 0) / 1000;
                  const durSec = (e.dDurationMs || 0) / 1000;
                  const text = decodeHtmlEntities(e.segs.map((s: any) => s.utf8 || '').join(''));
                  return {
                    start: startSec,
                    dur: durSec,
                    text,
                    timestamp: formatTimestamp(startSec)
                  };
                })
                .filter((s: TranscriptSegment) => s.text.length > 0);
            }
          }
        }
      } catch {
        // Fallback to XML
      }

      // If JSON3 was empty, try raw XML timedtext
      if (segments.length === 0) {
        try {
          const xmlRes = await fetch(track.baseUrl);
          if (xmlRes.ok) {
            const xmlText = await xmlRes.text();
            const regex = /<text\s+start="([\d\.]+)"(?:\s+dur="([\d\.]+)")?[^>]*>([^<]+)<\/text>/g;
            let match;
            while ((match = regex.exec(xmlText)) !== null) {
              const startSec = parseFloat(match[1]);
              const durSec = match[2] ? parseFloat(match[2]) : 0;
              const text = decodeHtmlEntities(match[3]);
              if (text) {
                segments.push({
                  start: startSec,
                  dur: durSec,
                  text,
                  timestamp: formatTimestamp(startSec)
                });
              }
            }
          }
        } catch {
          // Continue to next track
        }
      }

      if (segments.length > 0) break;
    }

    if (segments.length === 0) {
      return res.status(404).json({
        success: false,
        videoId,
        title,
        message: 'This video does not contain spoken captions or transcripts (e.g. background music, meditation, or instrumental video).'
      });
    }

    const author = playerResponse?.videoDetails?.author || 'YouTube Creator';
    const fullText = segments.map((s) => s.text).join(' ');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    const result = {
      videoId,
      title,
      author,
      language: chosenTrack.name?.simpleText || chosenTrack.languageCode || 'English',
      wordCount,
      segmentsCount: segments.length,
      segments,
      fullText
    };

    // Cache in Redis for 24 hours (86400 seconds)
    try {
      await setCache(cacheKey, result, 86400);
    } catch (cacheErr) {
      console.warn(`[Redis Cache] set error for ${cacheKey}:`, cacheErr);
    }

    return res.status(200).json({
      success: true,
      cached: false,
      ...result
    });
  } catch (error: any) {
    console.error('[Public Tools] Error fetching YouTube transcript:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred while fetching the transcript.'
    });
  }
}

const WORLD_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'SGD',
  'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'NZD', 'HKD', 'BRL', 'MXN',
  'ZAR', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'PHP', 'IDR', 'THB', 'MYR',
  'VND', 'KRW', 'TWD', 'EGP', 'NGN', 'KES', 'GHS', 'PKR', 'BDT', 'NPR',
  'LKR', 'ARS', 'CLP', 'COP', 'PEN', 'ILS', 'CZK', 'HUF', 'RON', 'BGN',
  'HRK', 'RSD', 'UAH', 'KZT', 'MAD', 'DZD', 'TND', 'JOD', 'LBP', 'IQD',
  'ISK', 'CRC', 'UYU', 'DOP', 'GTQ', 'PAB', 'BOB', 'PYG', 'VES', 'JMD'
];

/**
 * Dynamically resolve currency symbol from currency code
 */
function resolveCurrencySymbol(currencyCode: string): string {
  try {
    const code = (currencyCode || 'USD').toString().trim().toUpperCase();
    return (0).toLocaleString('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).replace(/\d/g, '').trim() || code;
  } catch {
    return currencyCode;
  }
}

/**
 * @route   GET /api/public/tools/currencies
 * @desc    Fetch all live world currencies with dynamic symbols, country names & exchange rates
 * @access  Public (Unauthenticated)
 */
export async function getCurrencies(req: Request, res: Response) {
  try {
    const cacheKey = 'public:tools:currencies:v2';
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          cached: true,
          ...cached
        });
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache] read error for currencies:', cacheErr);
    }

    let rates: Record<string, number> = {};

    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (response.ok) {
        const data: any = await response.json();
        rates = data.rates || {};
      }
    } catch (fetchErr) {
      console.warn('[Currency API] External exchange rate API fetch failed, falling back to defaults:', fetchErr);
    }

    const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

    // Combine all codes from rates and predefined world currency codes
    const allCodes = Array.from(new Set([...WORLD_CURRENCY_CODES, ...Object.keys(rates)]));

    const currencies = allCodes
      .map((code) => {
        let name = code;
        try {
          name = currencyNames.of(code) || code;
        } catch {
          name = code;
        }

        return {
          code,
          name,
          symbol: resolveCurrencySymbol(code),
          rateToUsd: rates[code] || undefined
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const payload = {
      count: currencies.length,
      base: 'USD',
      updatedAt: new Date().toISOString(),
      currencies
    };

    // Cache in Redis for 24 hours
    try {
      await setCache(cacheKey, payload, 86400);
    } catch (cacheErr) {
      console.warn('[Redis Cache] set error for currencies:', cacheErr);
    }

    return res.status(200).json({
      success: true,
      cached: false,
      ...payload
    });
  } catch (error: any) {
    console.error('[Currency API] Error in getCurrencies controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve currency dataset.'
    });
  }
}
