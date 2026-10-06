/**
 * Speech-to-text bake-off: runs every configured provider over the same clips and prints word error rate,
 * latency and the detected language, so the primary provider is chosen on our own audio.
 *
 * Folder layout: one audio file per clip (m4a / wav / mp3) and a reference transcript with the same name
 * and a .txt extension (clip1.m4a + clip1.txt), written in the script the captions should use.
 *
 * Run: npx tsx apps/backend/scripts/stt-bakeoff.ts <folder> [language]
 * Keys: GROQ_API_KEY, OPENAI_API_KEY (a provider without a key is skipped).
 * Uses provider credits.
 */
import * as fs from "fs";
import * as path from "path";
import { STT_PROVIDERS, SttProvider, transcribeWithProvider, AUTO_LANGUAGE } from "../src/api/v1/media-editor/media-transcription";

const MIME: Record<string, string> = { ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".aac": "audio/aac", ".ogg": "audio/ogg", ".webm": "audio/webm" };

/** Lower-case words without punctuation (letters, marks and digits of any script are kept). */
export const normaliseWords = (text: string): string[] =>
  text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** Word error rate: (substitutions + deletions + insertions) / reference words. */
export function wordErrorRate(reference: string, hypothesis: string): number {
  const r = normaliseWords(reference);
  const h = normaliseWords(hypothesis);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  let prev = Array.from({ length: h.length + 1 }, (_, j) => j);
  for (let i = 1; i <= r.length; i++) {
    const cur = [i];
    for (let j = 1; j <= h.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[h.length] / r.length;
}

async function main() {
  const dir = process.argv[2];
  const language = process.argv[3] || AUTO_LANGUAGE;
  if (!dir || !fs.existsSync(dir)) {
    console.error("Usage: npx tsx apps/backend/scripts/stt-bakeoff.ts <folder> [language]");
    process.exit(1);
  }
  const creds = { groqKey: process.env.GROQ_API_KEY, openaiKey: process.env.OPENAI_API_KEY };
  const providers = STT_PROVIDERS.filter((p) => (p === "groq" ? creds.groqKey : creds.openaiKey));
  if (providers.length === 0) {
    console.error("No STT key is set (GROQ_API_KEY, OPENAI_API_KEY).");
    process.exit(1);
  }
  const clips = fs.readdirSync(dir).filter((f) => MIME[path.extname(f).toLowerCase()] && fs.existsSync(path.join(dir, `${path.parse(f).name}.txt`)));
  if (clips.length === 0) {
    console.error("No clips with a matching .txt reference transcript were found.");
    process.exit(1);
  }

  const totals = new Map<SttProvider, { wer: number; ms: number; ok: number; failed: number }>();
  for (const p of providers) totals.set(p, { wer: 0, ms: 0, ok: 0, failed: 0 });
  for (const clip of clips) {
    const audio = fs.readFileSync(path.join(dir, clip));
    const reference = fs.readFileSync(path.join(dir, `${path.parse(clip).name}.txt`), "utf8");
    for (const p of providers) {
      const t0 = Date.now();
      const out = await transcribeWithProvider(p, creds, audio, clip, MIME[path.extname(clip).toLowerCase()], language);
      const ms = Date.now() - t0;
      const t = totals.get(p)!;
      if (!out) {
        t.failed++;
        console.log(`${clip}\t${p}\tFAILED\t${ms} ms`);
        continue;
      }
      const wer = wordErrorRate(reference, out.text || out.words.map((w) => w.text).join(" "));
      t.wer += wer;
      t.ms += ms;
      t.ok++;
      console.log(`${clip}\t${p}\tWER ${(wer * 100).toFixed(1)}%\t${ms} ms\tlang ${out.language}\t${out.words.length} words`);
    }
  }
  console.log("\nProvider\tmean WER\tmean latency\tclips ok\tfailed");
  for (const [p, t] of totals) {
    console.log(`${p}\t${t.ok ? ((t.wer / t.ok) * 100).toFixed(1) + "%" : "n/a"}\t${t.ok ? Math.round(t.ms / t.ok) + " ms" : "n/a"}\t${t.ok}\t${t.failed}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  });
}
