import ffmpeg from "./ffmpeg-setup";
import * as path from "path";
import * as fs from "fs";
import { AudioTrack, AudioDuckingConfig } from "@workspace/video-contracts";

export class AudioDuckingMixer {
  /**
   * High-level multi-track filtergraph builder
   */
  static buildFilterGraph(
    tracks: AudioTrack[],
    options: { duckThresholdDb?: number; attenuationDb?: number; attackMs?: number; releaseMs?: number } = {}
  ): string {
    const dialogueTrack = tracks.find((t) => (t.type === "PRIMARY_VOICE" || (t.type as any) === "DIALOGUE"));
    const bgmTrack = tracks.find((t) => t.type === "BGM");

    if (dialogueTrack && bgmTrack) {
      return this.buildDuckingFiltergraph(0, 1, {
        enabled: true,
        thresholdDb: options.duckThresholdDb ?? -24.0,
        duckAmountDb: options.attenuationDb ?? -18.0,
        attackMs: options.attackMs ?? 120,
        releaseMs: options.releaseMs ?? 350,
        holdMs: 100,
      });
    } else if (bgmTrack) {
      const vol = Math.pow(10, (bgmTrack.volumeDb ?? 0) / 20);
      return `[0:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=${vol.toFixed(2)}[out_audio]`;
    } else if (dialogueTrack) {
      const vol = Math.pow(10, (dialogueTrack.volumeDb ?? 0) / 20);
      return `[0:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=${vol.toFixed(2)}[out_audio]`;
    }

    return `[0:a]aformat=channel_layouts=stereo:sample_rates=48000,volume=1.0[out_audio]`;
  }

  /**
   * Generates an FFmpeg complex filter string to dynamically duck Background Music
   * whenever Dialogue audio exceeds the specified volume threshold.
   * Hardened: Pre-formats all inputs to stereo 48kHz to eliminate mono/stereo channel mismatches.
   */
  static buildDuckingFiltergraph(
    dialogueInputIndex: number,
    bgmInputIndex: number,
    config: AudioDuckingConfig = {
      enabled: true,
      thresholdDb: -24.0,
      duckAmountDb: -18.0,
      attackMs: 120,
      releaseMs: 350,
      holdMs: 100,
    }
  ): string {
    const thresholdLin = Math.pow(10, config.thresholdDb / 20); // convert dB to linear amplitude
    const ratio = Math.abs(config.duckAmountDb) / 4;

    // Production Hardening:
    // 1. Format BGM to 48kHz stereo
    // 2. Format Dialogue (even if mono lavalier) to 48kHz stereo
    // 3. Sidechain compression
    // 4. Mix both stereo streams
    return (
      `[${bgmInputIndex}:a]aformat=channel_layouts=stereo:sample_rates=48000[bgm_fmt];` +
      `[${dialogueInputIndex}:a]aformat=channel_layouts=stereo:sample_rates=48000,asplit=2[dia_sc][dia_mix];` +
      `[bgm_fmt][dia_sc]sidechaincompress=threshold=${thresholdLin.toFixed(
        4
      )}:ratio=${ratio.toFixed(2)}:attack=${config.attackMs}:release=${config.releaseMs}[ducked_bgm];` +
      `[dia_mix][ducked_bgm]amix=inputs=2:duration=first[out_audio]`
    );
  }

  /**
   * Mixes multiple audio tracks with speech ducking into a master AAC audio track.
   * Gracefully handles cases where dialogue video has no audio stream.
   */
  static async mixTracks(
    dialoguePath: string,
    bgmPath: string | null,
    outputPath: string,
    config?: AudioDuckingConfig
  ): Promise<string> {
    if (!bgmPath || !fs.existsSync(bgmPath)) {
      // If no BGM, pass dialogue audio or silence
      if (dialoguePath !== outputPath) {
        fs.copyFileSync(dialoguePath, outputPath);
      }
      return outputPath;
    }

    // Check if dialogue media has an audio stream
    const hasDialogueAudio = await new Promise<boolean>((resolve) => {
      ffmpeg.ffprobe(dialoguePath, (err, metadata) => {
        if (err || !metadata || !metadata.streams) {
          resolve(false);
          return;
        }
        const aStream = metadata.streams.find((s: any) => s.codec_type === "audio");
        resolve(!!aStream);
      });
    });

    if (!hasDialogueAudio) {
      // Dialogue has no audio: Output formatted BGM directly without ducking
      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(bgmPath)
          .audioFilters("aformat=channel_layouts=stereo:sample_rates=48000")
          .audioCodec("aac")
          .audioBitrate("192k")
          .output(outputPath)
          .on("end", () => resolve(outputPath))
          .on("error", (err: any) => reject(err))
          .run();
      });
    }

    const filtergraph = this.buildDuckingFiltergraph(0, 1, config);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(dialoguePath)
        .input(bgmPath)
        .complexFilter(filtergraph, ["out_audio"])
        .audioCodec("aac")
        .audioBitrate("192k")
        .output(outputPath)
        .on("end", () => resolve(outputPath))
        .on("error", (err: any) => reject(err))
        .run();
    });
  }
}
