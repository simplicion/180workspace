import ffmpeg from "./ffmpeg-setup";
import * as fs from "fs";
import axios from "axios";
import FormData from "form-data";
import type { TranscriptWordIntelligence } from "@workspace/video-contracts";

export interface TranscriptionResult {
  durationSeconds: number;
  fullTranscript: string;
  words: TranscriptWordIntelligence[];
  language: string;
  transcriptionFailed: boolean;
}

/**
 * Real Cartesia STT transcription, generalized from
 * packages/video-engine-runtime/src/intelligence/multi-take-transcriber.ts.
 *
 * Differences from that version:
 *  - `language` is a caller-supplied parameter (was hardcoded to "hi").
 *  - Emphasis detection is a generic, content-agnostic heuristic (word duration vs.
 *    the clip's median word duration) instead of a hardcoded medical/Hindi keyword list.
 *  - On STT failure, returns `transcriptionFailed: true` with empty words rather than
 *    fabricating plausible-looking words — callers must treat an absent transcript as
 *    absent, never invent dialogue.
 */
export class MediaTranscriber {
  static async transcribe(mediaPath: string, options: { language?: string } = {}): Promise<TranscriptionResult> {
    const wavPath = `${mediaPath}.${Date.now()}.stt.wav`;
    try {
      await this.extractAudioWav(mediaPath, wavPath);
      const result = await this.transcribeAudioFile(wavPath, options.language || "en");
      return { ...result, transcriptionFailed: false };
    } catch (err: any) {
      console.warn(`[MediaTranscriber] transcription failed for ${mediaPath}:`, err?.message);
      return {
        durationSeconds: 0,
        fullTranscript: "",
        words: [],
        language: options.language || "en",
        transcriptionFailed: true,
      };
    } finally {
      try {
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
      } catch {
        // best-effort cleanup
      }
    }
  }

  private static extractAudioWav(mediaPath: string, wavPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(mediaPath)
        .noVideo()
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .outputOptions(["-y"])
        .output(wavPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  private static async transcribeAudioFile(
    wavPath: string,
    language: string
  ): Promise<Omit<TranscriptionResult, "transcriptionFailed">> {
    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) {
      throw new Error("CARTESIA_API_KEY is not set.");
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(wavPath));
    form.append("model", "ink-whisper");
    form.append("language", language);

    const res = await axios.post("https://api.cartesia.ai/stt", form, {
      headers: { ...form.getHeaders(), "X-API-Key": apiKey, "Cartesia-Version": "2024-06-10" },
      timeout: 60000,
    });

    const data = res.data;
    const text: string = data.text || "";
    const durationSeconds = data.duration || 0;

    const rawWords: Array<{ word: string; start: number; end: number; confidence?: number }> = [];
    if (data.words && Array.isArray(data.words) && data.words.length > 0) {
      for (const w of data.words) {
        rawWords.push({ word: w.word, start: w.start, end: w.end, confidence: w.confidence });
      }
    } else {
      const tokens = text.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0 && durationSeconds > 0) {
        const wordDur = Math.max(0.25, Math.min(0.55, (durationSeconds - 0.6) / tokens.length));
        let cur = 0.3;
        for (const token of tokens) {
          rawWords.push({ word: token, start: cur, end: cur + wordDur * 0.85 });
          cur += wordDur;
        }
      }
    }

    const durations = rawWords.map((w) => w.end - w.start).filter((d) => d > 0);
    const medianDuration = durations.length > 0 ? [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)] : 0;

    const words: TranscriptWordIntelligence[] = rawWords.map((w, idx) => {
      const wordDuration = w.end - w.start;
      // Generic, content-agnostic emphasis heuristic: a word held noticeably longer
      // than this clip's median word duration is treated as a mild emphasis signal.
      // This is an approximation, not a real prosody/stress analysis.
      const isEmphasis = medianDuration > 0 && wordDuration > medianDuration * 1.6;
      return {
        id: `w_${idx}`,
        word: w.word,
        startSeconds: w.start,
        endSeconds: w.end,
        confidence: w.confidence ?? 0.95,
        isEmphasis,
        emphasisScore: isEmphasis ? Math.min(1, wordDuration / (medianDuration * 2)) : 0,
        energyScore: 0,
      };
    });

    return { durationSeconds, fullTranscript: text, words, language: data.language || language };
  }
}
