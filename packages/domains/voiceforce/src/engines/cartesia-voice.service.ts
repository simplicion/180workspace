import axios from 'axios';
import FormData from 'form-data';

let customRedisClient: any = null;
function getRedis(): any {
  if (customRedisClient) return customRedisClient;
  try {
    if (process.env.REDIS_URL) {
      const Redis = require('ioredis');
      customRedisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
      return customRedisClient;
    }
  } catch {
    return null;
  }
  return null;
}

export function setCartesiaVoiceRedisClient(client: any) {
  customRedisClient = client;
}

export interface CartesiaVoice {
  id: string;
  name: string;
  description?: string;
  language: string;
  gender: 'female' | 'male' | 'neutral';
  isPublic: boolean;
  isCloned: boolean;
  createdAt?: string;
  tags?: string[];
  previewUrl?: string;
}

export interface VoicePreviewOptions {
  voiceId: string;
  text?: string;
  modelId?: 'sonic-3.6' | 'sonic-3.5' | 'sonic-3' | 'sonic-latest' | string;
  speed?: number; // 0.6 to 1.5
  volume?: number; // 0.5 to 2.0
  emotion?: 'neutral' | 'calm' | 'angry' | 'content' | 'sad' | string;
  locale?: string; // e.g. "en-US", "en-IN", "hi-IN"
  normalization?: 'auto' | 'off' | string;
  sampleRate?: 8000 | 16000 | 22050 | 24000 | 44100 | 48000;
  encoding?: 'pcm_s16le' | 'pcm_f32le' | 'pcm_mulaw' | 'pcm_alaw';
  container?: 'wav' | 'raw' | 'mp3';
  pronunciationDictId?: string;
}

export interface VoiceCloneOptions {
  name: string;
  description?: string;
  language?: string;
  audioBuffer: Buffer;
  filename?: string;
  mimeType?: string;
}

export interface STTTranscribeOptions {
  audioBuffer: Buffer;
  filename?: string;
  mimeType?: string;
  model?: 'ink-whisper' | 'ink-2' | string;
  language?: string;
  encoding?: 'pcm_s16le' | 'pcm_s32le' | 'pcm_f16le' | 'pcm_f32le' | 'pcm_mulaw' | 'pcm_alaw';
  sampleRate?: number;
}

export interface STTTurnsWebSocketConfigOptions {
  model?: 'ink-2' | 'ink-preview';
  encoding?: 'pcm_s16le' | 'pcm_s32le' | 'pcm_f16le' | 'pcm_f32le' | 'pcm_mulaw' | 'pcm_alaw';
  sampleRate?: number;
  turnStartThreshold?: number; // 0.5 to 0.9 (default 0.8)
  turnEagerEndThreshold?: number; // 0.3 to 0.6 (default 0.4)
  turnEndThreshold?: number; // 0.05 to 0.5 (default 0.2)
  turnEndTimeoutMs?: number; // 640 to 11200 (default 5600)
  keyterms?: string[]; // Up to 100 keyterms totaling 1200 chars
}

export class CartesiaVoiceService {
  public static readonly CARTESIA_BASE_URL = 'https://api.cartesia.ai';
  public static readonly CARTESIA_WS_URL = 'wss://api.cartesia.ai';
  public static readonly API_VERSION = '2026-08-14';

  private static getApiKey(): string | undefined {
    return process.env.CARTESIA_API_KEY || process.env.CARTESIA_KEY;
  }

  /**
   * Retrieves all available Cartesia voices (official public catalog + custom clones)
   * with Redis caching and rich language/gender categorization.
   */
  static async listVoices(options: {
    language?: string;
    gender?: string;
    search?: string;
    onlyCloned?: boolean;
  } = {}): Promise<CartesiaVoice[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return this.getFallbackCuratedVoices();
    }

    const cacheKey = 'voiceforce:cartesia_voices_cache';
    const redis = getRedis();

    let rawVoices: any[] | null = null;
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          rawVoices = JSON.parse(cached);
        }
      } catch {}
    }

    if (!rawVoices) {
      try {
        let allItems: any[] = [];
        let cursor: string | null = null;
        let page = 0;

        do {
          const params: any = { limit: 100 };
          if (cursor) params.starting_after = cursor;

          const res = await axios.get(`${this.CARTESIA_BASE_URL}/voices`, {
            headers: {
              'X-API-Key': apiKey,
              'Cartesia-Version': this.API_VERSION
            },
            params,
            timeout: 10000
          });

          const pageData = res.data;
          const items = Array.isArray(pageData) ? pageData : (pageData?.data || []);
          allItems = allItems.concat(items);

          cursor = pageData?.has_more && pageData?.next_page ? pageData.next_page : null;
          page++;
        } while (cursor && page < 10);

        if (allItems.length > 0) {
          rawVoices = allItems;
          if (redis) {
            try {
              // Cache for 30 minutes
              await redis.set(cacheKey, JSON.stringify(rawVoices), 'EX', 1800);
            } catch {}
          }
        }
      } catch (err: any) {
        console.warn('[CartesiaVoiceService] Live voice fetch failed, using curated catalog:', err.message);
        return this.getFallbackCuratedVoices();
      }
    }

    if (!rawVoices || !Array.isArray(rawVoices) || rawVoices.length === 0) {
      return this.getFallbackCuratedVoices();
    }

    // Map and sanitize voices
    let voices: CartesiaVoice[] = rawVoices.map((v: any) => {
      const rawGender = String(v.gender || '').toLowerCase();
      let gender: 'female' | 'male' | 'neutral' = 'neutral';
      if (rawGender.includes('fem') || rawGender.includes('woman') || rawGender.includes('female')) {
        gender = 'female';
      } else if (rawGender.includes('masc') || rawGender.includes('man') || rawGender.includes('male')) {
        gender = 'male';
      }

      const isOwned = v.is_owner === true || v.access === 'private' || v.visibility === 'owner';
      const isPublic = v.is_public !== false && !isOwned && v.access !== 'private';
      const isCloned = isOwned || !isPublic;

      return {
        id: v.id,
        name: v.name || 'Custom Voice',
        description: v.description || (isCloned ? 'Custom Company Voice Clone' : 'Cartesia Studio Voice'),
        language: v.language || 'en',
        gender,
        isPublic,
        isCloned,
        createdAt: v.created_at || undefined,
        tags: this.deriveVoiceTags(v.name, v.description, v.language, gender)
      };
    });

    // Apply filtering
    if (options.onlyCloned) {
      voices = voices.filter(v => v.isCloned);
    }

    if (options.language && options.language !== 'all') {
      const targetLang = options.language.toLowerCase().trim();
      const targetBase = targetLang.split('-')[0];
      voices = voices.filter(v => {
        const vLang = (v.language || '').toLowerCase().trim();
        const vBase = vLang.split('-')[0];
        return vLang === targetLang || vBase === targetLang || vBase === targetBase || vLang.startsWith(targetBase);
      });
    }

    if (options.gender && options.gender !== 'all') {
      voices = voices.filter(v => v.gender === options.gender);
    }

    if (options.search && options.search.trim()) {
      const query = options.search.toLowerCase().trim();
      voices = voices.filter(v => 
        v.name.toLowerCase().includes(query) || 
        (v.description && v.description.toLowerCase().includes(query)) ||
        (v.tags && v.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    // Sort: Cloned first, then alphabetically by name
    return voices.sort((a, b) => {
      if (a.isCloned && !b.isCloned) return -1;
      if (!a.isCloned && b.isCloned) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Generates a rapid sub-100ms voice audio preview for browser listening using Cartesia TTS Bytes API
   */
  static async generateAudioPreview(options: VoicePreviewOptions): Promise<{
    audioBase64: string;
    byteLength: number;
    durationEstimateSec: number;
    format: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CARTESIA_API_KEY is not configured on the server');
    }

    const {
      voiceId,
      text = 'Hello! I am your autonomous AI employee. How can I assist your business today?',
      modelId = 'sonic-3.6',
      speed = 1.0,
      volume = 1.0,
      emotion,
      locale,
      normalization,
      sampleRate = 44100,
      encoding = 'pcm_s16le',
      container = 'wav',
      pronunciationDictId
    } = options;

    if (!voiceId) {
      throw new Error('voiceId is required for audio preview synthesis');
    }

    // Clamp speed [0.6, 1.5] and volume [0.5, 2.0]
    const clampedSpeed = Math.min(1.5, Math.max(0.6, Number(speed) || 1.0));
    const clampedVolume = Math.min(2.0, Math.max(0.5, Number(volume) || 1.0));

    const generationConfig: any = {
      speed: clampedSpeed,
      volume: clampedVolume
    };
    if (emotion) {
      generationConfig.emotion = emotion;
    }

    const requestBody: any = {
      model_id: modelId || 'sonic-3.6',
      transcript: text.slice(0, 500),
      voice: {
        mode: 'id',
        id: voiceId
      },
      output_format: {
        container: container || 'wav',
        encoding: encoding || 'pcm_s16le',
        sample_rate: sampleRate || 44100
      },
      generation_config: generationConfig
    };

    if (locale) {
      requestBody.locale = locale;
    }
    if (normalization) {
      requestBody.normalization = normalization;
    }
    if (pronunciationDictId) {
      requestBody.pronunciation_dict_id = pronunciationDictId;
    }

    try {
      const res = await axios.post(
        `${this.CARTESIA_BASE_URL}/tts/bytes`,
        requestBody,
        {
          headers: {
            'X-API-Key': apiKey,
            'Cartesia-Version': this.API_VERSION,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 8000
        }
      );

      const buffer = Buffer.from(res.data);
      const mimeType = container === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const audioBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      const durationEstimateSec = Math.max(0.5, Math.round((buffer.length / (sampleRate * 2)) * 10) / 10);

      return {
        audioBase64,
        byteLength: buffer.length,
        durationEstimateSec,
        format: `${container}_${encoding}_${sampleRate}Hz`
      };
    } catch (err: any) {
      const errDetail = err.response?.data 
        ? Buffer.isBuffer(err.response.data) ? Buffer.from(err.response.data).toString() : JSON.stringify(err.response.data)
        : err.message;
      throw new Error(`Cartesia preview synthesis failed: ${errDetail}`);
    }
  }

  /**
   * Creates an instant custom voice clone by uploading an audio sample to Cartesia
   */
  static async cloneVoiceFromAudio(options: VoiceCloneOptions): Promise<CartesiaVoice> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CARTESIA_API_KEY is required for voice cloning');
    }

    const {
      name,
      description = 'Custom voice clone',
      language = 'en',
      audioBuffer,
      filename = 'sample.wav',
      mimeType = 'audio/wav'
    } = options;

    if (!name || !audioBuffer || audioBuffer.length === 0) {
      throw new Error('Voice name and a valid audio clip are required for voice cloning');
    }

    const form = new FormData();
    form.append('name', name);
    form.append('description', description);
    form.append('language', language);
    form.append('clip', audioBuffer, {
      filename: filename || 'sample.wav',
      contentType: mimeType || 'audio/wav'
    });

    try {
      // 2026 Cartesia API endpoint: POST https://api.cartesia.ai/voices/clone
      const res = await axios.post(
        `${this.CARTESIA_BASE_URL}/voices/clone`,
        form,
        {
          headers: {
            'X-API-Key': apiKey,
            'Cartesia-Version': this.API_VERSION,
            ...form.getHeaders()
          },
          timeout: 25000
        }
      );

      // Invalidate Redis voice cache so new voice appears immediately
      const redis = getRedis();
      if (redis) {
        try {
          await redis.del('voiceforce:cartesia_voices_cache');
        } catch {}
      }

      const created = res.data;
      return {
        id: created.id,
        name: created.name || name,
        description: created.description || description,
        language: created.language || language,
        gender: 'neutral',
        isPublic: false,
        isCloned: true,
        createdAt: created.created_at || new Date().toISOString(),
        tags: ['Custom Clone', 'Voice Studio']
      };
    } catch (err: any) {
      const isPlanUpgrade = err.response?.status === 402 || 
        err.response?.data?.error_code === 'plan_upgrade_required' ||
        String(err.response?.data?.message || '').includes('plan_upgrade_required') ||
        String(err.response?.data?.message || '').includes('free tier');

      if (isPlanUpgrade) {
        throw new Error(
          'Cartesia Instant Voice Cloning via API requires a Cartesia Pro subscription (https://play.cartesia.ai/subscription). ' +
          'Alternatively, you can clone this voice directly in your Cartesia Web Console (https://play.cartesia.ai/voices) and it will automatically sync into your 180 Voiceforce Studio!'
        );
      }

      const errDetail = err.response?.data?.message || (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      throw new Error(`Cartesia voice clone failed: ${errDetail}`);
    }
  }

  /**
   * Batch Speech-to-Text Transcription via POST https://api.cartesia.ai/stt
   * For post-call recording transcription, voicemails, and audio files
   */
  static async transcribeAudioFile(options: STTTranscribeOptions): Promise<{
    transcript: string;
    language?: string;
    durationSec?: number;
    words?: Array<{ word: string; start: number; end: number }>;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CARTESIA_API_KEY is required for STT transcription');
    }

    const {
      audioBuffer,
      filename = 'call-recording.wav',
      mimeType = 'audio/wav',
      model = 'ink-whisper',
      language = 'en',
      encoding,
      sampleRate
    } = options;

    const form = new FormData();
    form.append('file', audioBuffer, {
      filename,
      contentType: mimeType
    });
    form.append('model', model);
    if (language) form.append('language', language);

    const queryParams: string[] = [];
    if (encoding) queryParams.push(`encoding=${encoding}`);
    if (sampleRate) queryParams.push(`sample_rate=${sampleRate}`);
    const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    try {
      const res = await axios.post(
        `${this.CARTESIA_BASE_URL}/stt${qs}`,
        form,
        {
          headers: {
            'X-API-Key': apiKey,
            'Cartesia-Version': this.API_VERSION,
            ...form.getHeaders()
          },
          timeout: 45000
        }
      );

      return {
        transcript: res.data?.text || res.data?.transcript || '',
        language: res.data?.language || language,
        durationSec: res.data?.duration,
        words: res.data?.words
      };
    } catch (err: any) {
      const errDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Cartesia STT transcription failed: ${errDetail}`);
    }
  }

  /**
   * Generates WebSocket connection URL and parameters for Realtime Speech-to-Text (Auto Turn Detection)
   * wss://api.cartesia.ai/stt/turns/websocket
   */
  static buildSTTTurnsWebSocketUrl(options: STTTurnsWebSocketConfigOptions = {}): {
    wsUrl: string;
    headers: Record<string, string>;
  } {
    const apiKey = this.getApiKey();
    const {
      model = 'ink-2',
      encoding = 'pcm_s16le',
      sampleRate = 16000,
      turnStartThreshold = 0.8,
      turnEagerEndThreshold = 0.4,
      turnEndThreshold = 0.2,
      turnEndTimeoutMs = 5600,
      keyterms = []
    } = options;

    const params = new URLSearchParams();
    params.set('model', model);
    params.set('encoding', encoding);
    params.set('sample_rate', String(sampleRate));
    params.set('cartesia_version', this.API_VERSION);
    params.set('turn_start_threshold', String(turnStartThreshold));
    params.set('turn_eager_end_threshold', String(turnEagerEndThreshold));
    params.set('turn_end_threshold', String(turnEndThreshold));
    params.set('turn_end_timeout_ms', String(turnEndTimeoutMs));

    // Append keyterms for acoustic domain boosting (e.g. company names, products)
    if (Array.isArray(keyterms)) {
      keyterms.slice(0, 100).forEach(term => {
        if (term && term.trim()) {
          params.append('keyterm', term.trim());
        }
      });
    }

    return {
      wsUrl: `${this.CARTESIA_WS_URL}/stt/turns/websocket?${params.toString()}`,
      headers: {
        'X-API-Key': apiKey || '',
        'Cartesia-Version': this.API_VERSION
      }
    };
  }

  /**
   * Generates WebSocket connection URL for Realtime Speech-to-Text (Manual streaming)
   * wss://api.cartesia.ai/stt/websocket
   */
  static buildSTTManualWebSocketUrl(options: {
    model?: 'ink-2' | 'ink-preview' | 'ink-whisper';
    encoding?: string;
    sampleRate?: number;
    keyterms?: string[];
  } = {}): {
    wsUrl: string;
    headers: Record<string, string>;
  } {
    const apiKey = this.getApiKey();
    const {
      model = 'ink-2',
      encoding = 'pcm_s16le',
      sampleRate = 16000,
      keyterms = []
    } = options;

    const params = new URLSearchParams();
    params.set('model', model);
    params.set('encoding', encoding);
    params.set('sample_rate', String(sampleRate));
    params.set('cartesia_version', this.API_VERSION);

    if (Array.isArray(keyterms)) {
      keyterms.slice(0, 100).forEach(term => {
        if (term && term.trim()) {
          params.append('keyterm', term.trim());
        }
      });
    }

    return {
      wsUrl: `${this.CARTESIA_WS_URL}/stt/websocket?${params.toString()}`,
      headers: {
        'X-API-Key': apiKey || '',
        'Cartesia-Version': this.API_VERSION
      }
    };
  }

  /**
   * Generates WebSocket connection URL for Realtime Text-to-Speech
   * wss://api.cartesia.ai/tts/websocket
   */
  static buildTTSWebSocketUrl(): {
    wsUrl: string;
    headers: Record<string, string>;
  } {
    const apiKey = this.getApiKey();
    return {
      wsUrl: `${this.CARTESIA_WS_URL}/tts/websocket?cartesia_version=${this.API_VERSION}`,
      headers: {
        'X-API-Key': apiKey || '',
        'Cartesia-Version': this.API_VERSION
      }
    };
  }

  /**
   * Helper to construct streaming generation JSON payload for TTS WebSocket
   */
  static buildTTSGenerationPayload(options: {
    contextId: string;
    transcript: string;
    voiceId: string;
    modelId?: string;
    continueStream?: boolean;
    speed?: number;
    volume?: number;
    emotion?: string;
    locale?: string;
    normalization?: string;
    encoding?: 'pcm_s16le' | 'pcm_f32le' | 'pcm_mulaw' | 'pcm_alaw';
    sampleRate?: number;
    addTimestamps?: boolean;
  }) {
    const {
      contextId,
      transcript,
      voiceId,
      modelId = 'sonic-3.6',
      continueStream = false,
      speed = 1.0,
      volume = 1.0,
      emotion,
      locale,
      normalization,
      encoding = 'pcm_s16le',
      sampleRate = 16000,
      addTimestamps = false
    } = options;

    const generationConfig: any = {
      speed: Math.min(1.5, Math.max(0.6, speed)),
      volume: Math.min(2.0, Math.max(0.5, volume))
    };
    if (emotion) generationConfig.emotion = emotion;

    const payload: any = {
      model_id: modelId,
      transcript,
      voice: {
        mode: 'id',
        id: voiceId
      },
      output_format: {
        container: 'raw',
        encoding,
        sample_rate: sampleRate
      },
      context_id: contextId,
      continue: continueStream,
      add_timestamps: addTimestamps,
      generation_config: generationConfig
    };

    if (locale) payload.locale = locale;
    if (normalization) payload.normalization = normalization;

    return payload;
  }

  /**
   * Helper to construct context cancellation payload for TTS WebSocket (Barge-in / Interruption)
   */
  static buildTTSCancelPayload(contextId: string) {
    return {
      context_id: contextId,
      cancel: true
    };
  }

  /**
   * Helper to derive visual tags for search & badges
   */
  private static deriveVoiceTags(name: string, description: string = '', language: string, gender: string): string[] {
    const tags: string[] = [];
    const text = `${name} ${description}`.toLowerCase();

    if (language === 'hi' || text.includes('indian') || text.includes('hindi')) tags.push('Hindi / Indic');
    else if (language === 'en') tags.push('English');
    else tags.push(language.toUpperCase());

    if (gender === 'female') tags.push('Female');
    else if (gender === 'male') tags.push('Male');

    if (text.includes('support') || text.includes('help') || text.includes('responder')) tags.push('Customer Support');
    if (text.includes('advisor') || text.includes('sales') || text.includes('pitch')) tags.push('Sales & Pitch');
    if (text.includes('guide') || text.includes('specialist') || text.includes('anchor')) tags.push('Professional');
    if (text.includes('warm') || text.includes('friendly') || text.includes('approachable')) tags.push('Warm & Friendly');

    return Array.from(new Set(tags));
  }

  /**
   * Curated baseline voices if Cartesia API is offline
   */
  private static getFallbackCuratedVoices(): CartesiaVoice[] {
    return [
      {
        id: '4e045189-a105-4024-921c-dc46b9794f61',
        name: 'Prince (Executive Founder)',
        description: 'Custom executive voice clone with authoritative, confident tone',
        language: 'en',
        gender: 'male',
        isPublic: false,
        isCloned: true,
        tags: ['Custom Clone', 'Executive', 'English', 'Male']
      },
      {
        id: 'cfce9402-0067-458b-95a7-95846f469406',
        name: 'Sheryl - Warm Briefing',
        description: 'Smooth, approachable female voice ideal for customer service and scheduling',
        language: 'en',
        gender: 'female',
        isPublic: true,
        isCloned: false,
        tags: ['English', 'Female', 'Customer Support', 'Warm & Friendly']
      },
      {
        id: '2bc8e99c-bf1c-4977-93ff-151d7383921c',
        name: 'Darren - Methodical Advisor',
        description: 'Crisp, articulate male specialist voice for technical consultations',
        language: 'en',
        gender: 'male',
        isPublic: true,
        isCloned: false,
        tags: ['English', 'Male', 'Sales & Pitch', 'Professional']
      },
      {
        id: '14008c51-fbf4-418e-ae23-9316a03dcfa2',
        name: 'Ishani - Thoughtful Responder',
        description: 'Clear, gentle Hindi & Indian English voice for empathetic support',
        language: 'hi',
        gender: 'female',
        isPublic: true,
        isCloned: false,
        tags: ['Hindi / Indic', 'Female', 'Customer Support', 'Warm & Friendly']
      },
      {
        id: 'cb9c954d-bcaa-43ed-82bf-aeb5e88a3cb5',
        name: 'Kabir - Service Integrator',
        description: 'Energetic, confident Hindi & Indian English voice for outbound sales',
        language: 'hi',
        gender: 'male',
        isPublic: true,
        isCloned: false,
        tags: ['Hindi / Indic', 'Male', 'Sales & Pitch', 'Professional']
      }
    ];
  }
}
