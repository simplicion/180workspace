import type { Request, Response, NextFunction } from "express";
import multer from "multer";

/**
 * Mobile transcription: the phone uploads the clip's AUDIO ONLY (m4a/wav/...), and we return
 * word-level timestamps from Cartesia STT. No media processing (ffmpeg) happens server-side.
 * Contract: docs/social-studio-mobile/AI_DIRECTOR_CONTRACT.md §1
 */

export const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/ogg",
]);

const CARTESIA_STT_URL = "https://api.cartesia.ai/stt";
const CARTESIA_VERSION = "2025-04-16";

export class TranscriptionUnavailableError extends Error {}
export class TranscriptionFailedError extends Error {}

export interface WordTimestamp {
  text: string;
  startMs: number;
  endMs: number;
}

export interface TranscriptionResponse {
  language: string;
  durationMs: number;
  text: string;
  words: WordTimestamp[];
}

export interface SttCredentials {
  groqKey?: string;
  openaiKey?: string;
  cartesiaKey?: string;
}

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const OPENAI_STT_URL = "https://api.openai.com/v1/audio/transcriptions";

/** Throws when no STT key is configured; never falls back to a literal. */
export function requireSttCredentials(override?: SttCredentials): SttCredentials {
  const groqKey = override?.groqKey || process.env.GROQ_API_KEY;
  const openaiKey = override?.openaiKey || process.env.OPENAI_API_KEY;
  const cartesiaKey = override?.cartesiaKey || process.env.CARTESIA_API_KEY;
  if (!groqKey && !openaiKey && !cartesiaKey) {
    throw new TranscriptionUnavailableError("No STT key configured on server (set OPENAI_API_KEY, GROQ_API_KEY, or CARTESIA_API_KEY).");
  }
  return { groqKey, openaiKey, cartesiaKey };
}

/**
 * Sends audio to Groq Whisper, OpenAI Whisper, or Cartesia batch STT with word timestamps.
 * Throws TranscriptionFailedError when the provider fails or returns no word timings (we never synthesize fake timings).
 */
export async function transcribeAudioBuffer(
  audio: Buffer,
  filename: string,
  mimeType: string,
  language = "en",
  fetchImpl: typeof fetch = fetch,
  credentialsOverride?: SttCredentials
): Promise<TranscriptionResponse> {
  const { groqKey, openaiKey, cartesiaKey } = requireSttCredentials(credentialsOverride);

  // Tier 1: Groq Whisper Cloud (ultra-fast ~0.5s, free tier: 7,200s/day)
  if (groqKey) {
    try {
      const groqForm = new FormData();
      groqForm.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), filename || "audio.wav");
      groqForm.append("model", "whisper-large-v3-turbo");
      groqForm.append("language", language);
      groqForm.append("response_format", "verbose_json");
      groqForm.append("timestamp_granularities[]", "word");

      const groqRes = await fetchImpl(GROQ_STT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: groqForm,
        signal: AbortSignal.timeout(30_000),
      });

      if (groqRes.ok) {
        const data: any = await groqRes.json();
        const rawWords: any[] = Array.isArray(data?.words) ? data.words : [];
        const words: WordTimestamp[] = rawWords
          .filter((w) => typeof w?.word === "string" && typeof w?.start === "number" && typeof w?.end === "number")
          .map((w) => ({
            text: String(w.word).trim(),
            startMs: Math.max(0, Math.round(w.start * 1000)),
            endMs: Math.max(0, Math.round(w.end * 1000)),
          }))
          .filter((w) => w.text.length > 0 && w.endMs >= w.startMs);

        const text: string = typeof data?.text === "string" ? data.text.trim() : "";
        if (words.length > 0 || !text) {
          const durationSec = typeof data?.duration === "number" ? data.duration : words.length ? words[words.length - 1].endMs / 1000 : 0;
          return {
            language: typeof data?.language === "string" ? data.language : language,
            durationMs: Math.round(durationSec * 1000),
            text,
            words,
          };
        }
      }
    } catch (groqErr: any) {
      console.warn("[Transcribe] Groq Whisper fallback notice:", groqErr?.message || groqErr);
    }
  }

  // Tier 2: OpenAI Whisper Cloud (whisper-1 with word timestamps)
  if (openaiKey) {
    try {
      const openaiForm = new FormData();
      openaiForm.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), filename || "audio.wav");
      openaiForm.append("model", "whisper-1");
      openaiForm.append("language", language);
      openaiForm.append("response_format", "verbose_json");
      openaiForm.append("timestamp_granularities[]", "word");

      const openaiRes = await fetchImpl(OPENAI_STT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: openaiForm,
        signal: AbortSignal.timeout(60_000),
      });

      if (openaiRes.ok) {
        const data: any = await openaiRes.json();
        const rawWords: any[] = Array.isArray(data?.words) ? data.words : [];
        const words: WordTimestamp[] = rawWords
          .filter((w) => typeof w?.word === "string" && typeof w?.start === "number" && typeof w?.end === "number")
          .map((w) => ({
            text: String(w.word).trim(),
            startMs: Math.max(0, Math.round(w.start * 1000)),
            endMs: Math.max(0, Math.round(w.end * 1000)),
          }))
          .filter((w) => w.text.length > 0 && w.endMs >= w.startMs);

        const text: string = typeof data?.text === "string" ? data.text.trim() : "";
        if (words.length > 0 || !text) {
          const durationSec = typeof data?.duration === "number" ? data.duration : words.length ? words[words.length - 1].endMs / 1000 : 0;
          return {
            language: typeof data?.language === "string" ? data.language : language,
            durationMs: Math.round(durationSec * 1000),
            text,
            words,
          };
        }
      } else {
        const errBody = await openaiRes.text().catch(() => "");
        console.warn(`[Transcribe] OpenAI Whisper error status ${openaiRes.status}:`, errBody.slice(0, 200));
      }
    } catch (openaiErr: any) {
      console.warn("[Transcribe] OpenAI Whisper fallback notice:", openaiErr?.message || openaiErr);
    }
  }

  // Tier 3: Cartesia STT (ink-whisper)
  if (!cartesiaKey) {
    throw new TranscriptionFailedError("Speech-to-text did not succeed and no alternate provider is configured.");
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), filename || "audio");
  form.append("model", "ink-whisper");
  form.append("language", language);
  form.append("timestamp_granularities[]", "word");

  let res: globalThis.Response;
  try {
    res = await fetchImpl(CARTESIA_STT_URL, {
      method: "POST",
      headers: { "X-API-Key": cartesiaKey, "Cartesia-Version": CARTESIA_VERSION },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err: any) {
    throw new TranscriptionFailedError(`STT request failed: ${err?.message || err}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TranscriptionFailedError(`STT provider returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const rawWords: any[] = Array.isArray(data?.words) ? data.words : [];
  const words: WordTimestamp[] = rawWords
    .filter((w) => typeof w?.word === "string" && typeof w?.start === "number" && typeof w?.end === "number")
    .map((w) => ({
      text: String(w.word).trim(),
      startMs: Math.max(0, Math.round(w.start * 1000)),
      endMs: Math.max(0, Math.round(w.end * 1000)),
    }))
    .filter((w) => w.text.length > 0 && w.endMs >= w.startMs);

  const text: string = typeof data?.text === "string" ? data.text.trim() : "";
  if (words.length === 0 && text.length > 0) {
    throw new TranscriptionFailedError("STT provider returned text without word timestamps");
  }

  const durationSec = typeof data?.duration === "number" ? data.duration : words.length ? words[words.length - 1].endMs / 1000 : 0;
  return {
    language: typeof data?.language === "string" ? data.language : language,
    durationMs: Math.round(durationSec * 1000),
    text,
    words,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TRANSCRIBE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_MIME_TYPES.has((file.mimetype || "").toLowerCase())) return cb(null, true);
    const err: any = new Error(`Unsupported audio type ${file.mimetype}`);
    err.code = "UNSUPPORTED_AUDIO_TYPE";
    cb(err);
  },
});

/** multer wrapper that maps upload errors to the contract's error codes. */
export function audioUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("audio")(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, error: "AUDIO_TOO_LARGE", message: `Audio must be ${MAX_TRANSCRIBE_BYTES / (1024 * 1024)} MB or smaller.` });
    }
    if (err.code === "UNSUPPORTED_AUDIO_TYPE") {
      return res.status(415).json({ success: false, error: "UNSUPPORTED_AUDIO_TYPE", message: err.message });
    }
    return res.status(400).json({ success: false, error: "INVALID_UPLOAD", message: err.message });
  });
}

export async function transcribeHandler(req: Request, res: Response) {
  const file = (req as any).file as { buffer: Buffer; originalname: string; mimetype: string } | undefined;
  if (!file) {
    return res.status(400).json({ success: false, error: "AUDIO_FILE_REQUIRED", message: "Upload the clip audio as multipart field 'audio'." });
  }
  const rawLang = typeof req.body?.language === "string" ? req.body.language.trim().toLowerCase() : "en";
  const language = /^[a-z]{2}(-[a-z]{2})?$/.test(rawLang) ? rawLang : "en";

  // Resolve STT keys (OpenAI from PlatformSettings / Company)
  let resolvedOpenaiKey: string | undefined = process.env.OPENAI_API_KEY;
  try {
    const { PlatformAiVaultService, AICompanyConfigService } = require("@workspace/ai");
    const companyId = (req as any).user?.companyId || (req as any).companyId;
    if (companyId) {
      const { settings } = await AICompanyConfigService.getCompanyAISettings(companyId);
      if (settings?.openaiKey) resolvedOpenaiKey = settings.openaiKey;
    }
    if (!resolvedOpenaiKey) {
      const vault = await PlatformAiVaultService.getDecryptedPlatformAiSettings();
      if (vault?.openaiKey) resolvedOpenaiKey = vault.openaiKey;
    }
  } catch (err: any) {
    // Non-fatal, fallback to environment key
  }

  try {
    const data = await transcribeAudioBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      language,
      fetch,
      { openaiKey: resolvedOpenaiKey }
    );
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    if (err instanceof TranscriptionUnavailableError) {
      return res.status(503).json({ success: false, error: "TRANSCRIPTION_UNAVAILABLE", message: "Transcription is not configured on the server." });
    }
    // Provider responses and internal errors are logged, never echoed to the client.
    console.error("[Transcribe]", err?.message || err);
    if (err instanceof TranscriptionFailedError) {
      return res.status(502).json({ success: false, error: "TRANSCRIPTION_FAILED", message: "Speech-to-text failed for this clip. Please try again." });
    }
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "Transcription failed" });
  }
}
