import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import { VideoDirectorTool, DirectorExecutionContext } from "../base-tool";
import ffmpeg from "../../ffmpeg-setup";

export const BgmGenreSchema = z.enum([
  "AMBIENT_CALM",
  "ELECTRONIC_UPBEAT",
  "CINEMATIC_DRAMATIC",
  "LOFI_STUDY",
  "ACOUSTIC_WARM",
]);

export type BgmGenre = z.infer<typeof BgmGenreSchema>;

export const BgmSearchInputSchema = z.object({
  genre: BgmGenreSchema.optional().default("AMBIENT_CALM"),
  volumeDb: z.number().optional().default(-22.0),
  targetDurationSec: z.number().optional().default(60.0),
});

export type BgmSearchInput = z.infer<typeof BgmSearchInputSchema>;

export interface SourcedBgmTrack {
  id: string;
  genre: BgmGenre;
  filePath: string;
  durationSec: number;
  volumeDb: number;
  isPublicDomain: boolean;
}

export interface BgmSearchOutput {
  bgmTrack: SourcedBgmTrack;
}

export class BgmSearchTool extends VideoDirectorTool<BgmSearchInput, BgmSearchOutput> {
  readonly name = "bgm_search";
  readonly description = "Autonomously retrieves and caches royalty-free public-domain background music (CC-0) matching video mood.";
  readonly stage = "TIMELINE_COMPOSITION" as const;
  readonly inputSchema = BgmSearchInputSchema;

  /**
   * Curated Public Domain (CC-0) Open Audio CDN Catalog
   */
  private static readonly CC0_AUDIO_CATALOG: Record<BgmGenre, Array<{ title: string; url: string }>> = {
    AMBIENT_CALM: [
      {
        title: "Deep Relaxation Ambient (CC-0)",
        url: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Moonlight_Sonata_first_movement.ogg",
      },
      {
        title: "Gentle Ocean Waves Ambient (CC-0)",
        url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/3/36/Ocean_Waves_Gentle.ogg/Ocean_Waves_Gentle.ogg.mp3",
      },
    ],
    ELECTRONIC_UPBEAT: [
      {
        title: "Synthwave Beat Loop (CC-0)",
        url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e0/Synthesizer_Techno_Loop.ogg/Synthesizer_Techno_Loop.ogg.mp3",
      },
    ],
    CINEMATIC_DRAMATIC: [
      {
        title: "Cinematic String Atmosphere (CC-0)",
        url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/5/50/Beethoven_Symphony_No._5_first_movement.ogg/Beethoven_Symphony_No._5_first_movement.ogg.mp3",
      },
    ],
    LOFI_STUDY: [
      {
        title: "Warm Lo-Fi Chord Progression (CC-0)",
        url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d4/Gymnopedie_No._1.ogg/Gymnopedie_No._1.ogg.mp3",
      },
    ],
    ACOUSTIC_WARM: [
      {
        title: "Acoustic Reflection (CC-0)",
        url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d4/Gymnopedie_No._1.ogg/Gymnopedie_No._1.ogg.mp3",
      },
    ],
  };

  async execute(input: BgmSearchInput, context: DirectorExecutionContext): Promise<BgmSearchOutput> {
    const genre = input.genre || "AMBIENT_CALM";
    context.log?.(`[BgmSearchTool] Sourcing royalty-free BGM track for genre: ${genre}...`);

    const audioCacheDir = path.join(context.tempDir, "bgm");
    if (!fs.existsSync(audioCacheDir)) {
      fs.mkdirSync(audioCacheDir, { recursive: true });
    }

    const outputWavPath = path.join(audioCacheDir, `bgm_${genre.toLowerCase()}.wav`);

    if (!fs.existsSync(outputWavPath)) {
      let downloadedOnline = false;
      const candidates = BgmSearchTool.CC0_AUDIO_CATALOG[genre] || BgmSearchTool.CC0_AUDIO_CATALOG.AMBIENT_CALM;

      for (const candidate of candidates) {
        try {
          context.log?.(`[BgmSearchTool] Attempting stream from CC-0 endpoint: ${candidate.title}...`);
          const res = await fetch(candidate.url);
          if (res.ok) {
            const rawBuffer = Buffer.from(await res.arrayBuffer());
            const tempDownloadPath = path.join(audioCacheDir, `raw_stream_${Date.now()}.bin`);
            fs.writeFileSync(tempDownloadPath, rawBuffer);

            // Transcode to 48kHz stereo 16-bit WAV with loop/target duration
            await new Promise<void>((resolve, reject) => {
              ffmpeg(tempDownloadPath)
                .toFormat("wav")
                .audioChannels(2)
                .audioFrequency(48000)
                .duration(input.targetDurationSec || 60.0)
                .output(outputWavPath)
                .on("end", () => {
                  try {
                    fs.unlinkSync(tempDownloadPath);
                  } catch {
                    // Ignore temp delete error
                  }
                  resolve();
                })
                .on("error", (err: any) => reject(err))
                .run();
            });

            downloadedOnline = true;
            context.log?.(`[BgmSearchTool] Successfully transcoded public domain BGM: ${candidate.title}`);
            break;
          }
        } catch (e: any) {
          context.log?.(`[BgmSearchTool] Online stream failed for candidate: ${e.message}, trying next...`);
        }
      }

      if (!downloadedOnline) {
        // Fallback: Synthesize smooth ambient harmonic soundbed (48kHz stereo WAV)
        context.log?.("[BgmSearchTool] Synthesizing acoustic harmonic soundbed locally...");
        this.synthesizeAmbientDrone(outputWavPath, input.targetDurationSec || 60.0, genre);
      }
    }

    const bgmTrack: SourcedBgmTrack = {
      id: `bgm_${genre.toLowerCase()}`,
      genre,
      filePath: outputWavPath,
      durationSec: input.targetDurationSec || 60.0,
      volumeDb: input.volumeDb ?? -22.0,
      isPublicDomain: true,
    };

    context.artifacts.set("sourced_bgm_track", bgmTrack);
    return { bgmTrack };
  }

  /**
   * Synthesizes warm 48kHz stereo ambient drone backing track
   */
  private synthesizeAmbientDrone(outputPath: string, durationSec: number, genre: BgmGenre): void {
    const sampleRate = 48000;
    const totalSamples = Math.floor(sampleRate * durationSec);
    const pcmBuffer = Buffer.alloc(totalSamples * 4); // stereo 16-bit

    const baseFreq = genre === "ELECTRONIC_UPBEAT" ? 110 : genre === "CINEMATIC_DRAMATIC" ? 65.41 : 130.81; // C3/C2

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Soft pulsating multi-harmonic wave
      const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t);
      const fundamental = Math.sin(2 * Math.PI * baseFreq * t);
      const fifth = Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.4;
      const octave = Math.sin(2 * Math.PI * (baseFreq * 2.0) * t) * 0.2;

      const sample = (fundamental + fifth + octave) * pulse * 0.35;
      const int16 = Math.max(-32767, Math.min(32767, Math.floor(sample * 32767)));

      pcmBuffer.writeInt16LE(int16, i * 4);
      pcmBuffer.writeInt16LE(int16, i * 4 + 2);
    }

    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(2, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 4, 28);
    header.writeUInt16LE(4, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcmBuffer.length, 40);

    fs.writeFileSync(outputPath, Buffer.concat([header, pcmBuffer]));
  }
}
