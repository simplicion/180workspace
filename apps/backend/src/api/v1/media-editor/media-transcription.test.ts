/**
 * Run: npx tsx --test apps/backend/src/api/v1/media-editor/media-transcription.test.ts
 * Live check (spends a few cents of Cartesia credit): CARTESIA_LIVE_WAV=path/to/speech.wav plus CARTESIA_API_KEY.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import {
  transcribeAudioBuffer,
  TranscriptionUnavailableError,
  TranscriptionFailedError,
  ALLOWED_AUDIO_MIME_TYPES,
} from "./media-transcription";

const withKey = async (value: string | undefined, fn: () => Promise<void>) => {
  const prev = process.env.CARTESIA_API_KEY;
  if (value === undefined) delete process.env.CARTESIA_API_KEY;
  else process.env.CARTESIA_API_KEY = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.CARTESIA_API_KEY;
    else process.env.CARTESIA_API_KEY = prev;
  }
};

test("throws TranscriptionUnavailableError when CARTESIA_API_KEY is missing (no literal fallback)", async () => {
  await withKey(undefined, async () => {
    let called = false;
    const fakeFetch: any = async () => { called = true; };
    await assert.rejects(transcribeAudioBuffer(Buffer.from("x"), "a.m4a", "audio/m4a", "en", fakeFetch), TranscriptionUnavailableError);
    assert.equal(called, false, "no network call without a key");
  });
});

test("maps Cartesia word timestamps (seconds) to ms and sends word granularity", async () => {
  await withKey("test-key-not-real", async () => {
    let captured: any;
    const fakeFetch: any = async (url: string, init: any) => {
      captured = { url, init };
      return new Response(JSON.stringify({
        text: "so here's the thing", language: "en", duration: 1.9,
        words: [
          { word: " so", start: 0.32, end: 0.48 },
          { word: "here's", start: 0.48, end: 0.761 },
          { word: "the", start: 0.8, end: 0.9 },
          { word: "thing", start: 0.9, end: 1.3 },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const out = await transcribeAudioBuffer(Buffer.from("RIFF...."), "clip.wav", "audio/wav", "en", fakeFetch);
    assert.equal(captured.url, "https://api.cartesia.ai/stt");
    assert.equal(captured.init.headers["X-API-Key"], "test-key-not-real");
    const form: FormData = captured.init.body;
    assert.equal(form.get("model"), "ink-whisper");
    assert.equal(form.get("timestamp_granularities[]"), "word");
    assert.deepEqual(out.words[0], { text: "so", startMs: 320, endMs: 480 });
    assert.deepEqual(out.words[1], { text: "here's", startMs: 480, endMs: 761 });
    assert.equal(out.durationMs, 1900);
    assert.equal(out.language, "en");
  });
});

test("maps Groq Whisper word timestamps (seconds) to ms and sends verbose_json", async () => {
  const prevGroq = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "gsk_test_key";
  try {
    let captured: any;
    const fakeFetch: any = async (url: string, init: any) => {
      captured = { url, init };
      return new Response(JSON.stringify({
        text: "growth happens every single day",
        language: "english",
        duration: 2.5,
        words: [
          { word: "growth", start: 0.1, end: 0.5 },
          { word: "happens", start: 0.51, end: 0.9 },
          { word: "every", start: 0.91, end: 1.2 },
          { word: "single", start: 1.21, end: 1.6 },
          { word: "day", start: 1.61, end: 2.1 },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const out = await transcribeAudioBuffer(Buffer.from("fake-audio"), "speech.wav", "audio/wav", "en", fakeFetch);
    assert.equal(captured.url, "https://api.groq.com/openai/v1/audio/transcriptions");
    assert.equal(captured.init.headers.Authorization, "Bearer gsk_test_key");
    const form: FormData = captured.init.body;
    assert.equal(form.get("model"), "whisper-large-v3-turbo");
    assert.equal(form.get("response_format"), "verbose_json");
    assert.equal(form.get("timestamp_granularities[]"), "word");
    assert.equal(out.words.length, 5);
    assert.deepEqual(out.words[0], { text: "growth", startMs: 100, endMs: 500 });
    assert.equal(out.durationMs, 2500);
  } finally {
    if (prevGroq === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prevGroq;
  }
});

test("provider errors and missing word timings are failures, never fabricated timings", async () => {
  await withKey("test-key-not-real", async () => {
    const err500: any = async () => new Response("upstream down", { status: 500 });
    await assert.rejects(transcribeAudioBuffer(Buffer.from("x"), "a.wav", "audio/wav", "en", err500), TranscriptionFailedError);
    const noWords: any = async () => new Response(JSON.stringify({ text: "hello world", duration: 2 }), { status: 200 });
    await assert.rejects(transcribeAudioBuffer(Buffer.from("x"), "a.wav", "audio/wav", "en", noWords), /without word timestamps/);
    const netErr: any = async () => { throw new Error("ECONNRESET"); };
    await assert.rejects(transcribeAudioBuffer(Buffer.from("x"), "a.wav", "audio/wav", "en", netErr), /ECONNRESET/);
  });
});

test("accepted mime types cover what Android/iOS recorders produce", () => {
  for (const m of ["audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav"]) assert.ok(ALLOWED_AUDIO_MIME_TYPES.has(m), m);
  assert.ok(!ALLOWED_AUDIO_MIME_TYPES.has("video/mp4"), "video uploads are refused (audio only)");
});

const liveWav = process.env.CARTESIA_LIVE_WAV;
test("LIVE Cartesia STT returns word timestamps", { skip: !liveWav || !process.env.CARTESIA_API_KEY ? "set CARTESIA_LIVE_WAV and CARTESIA_API_KEY" : false }, async () => {
  const out = await transcribeAudioBuffer(fs.readFileSync(liveWav!), "live.wav", "audio/wav", "en");
  console.log(JSON.stringify({ durationMs: out.durationMs, text: out.text, words: out.words.slice(0, 8), wordCount: out.words.length }));
  assert.ok(out.words.length > 3);
  assert.ok(out.words.every((w, i) => w.endMs >= w.startMs && (i === 0 || w.startMs >= out.words[i - 1].startMs)));
});
