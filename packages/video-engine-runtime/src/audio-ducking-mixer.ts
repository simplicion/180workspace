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
      return `[0:a]volume=${vol.toFixed(2)}[out_audio]`;
    } else if (dialogueTrack) {
      const vol = Math.pow(10, (dialogueTrack.volumeDb ?? 0) / 20);
      return `[0:a]volume=${vol.toFixed(2)}[out_audio]`;
    }

    return `[0:a]volume=1.0[out_audio]`;
  }

  /**
   * Generates an FFmpeg complex filter string to dynamically duck Background Music
   * whenever Dialogue audio exceeds the specified volume threshold.
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

    // Sidechain compression: Input 1 (Dialogue) triggers gain reduction on Input 2 (BGM)
    return `[${bgmInputIndex}:a][${dialogueInputIndex}:a]sidechaincompress=threshold=${thresholdLin.toFixed(
      4
    )}:ratio=${ratio.toFixed(2)}:attack=${config.attackMs}:release=${config.releaseMs}[ducked_bgm];[${dialogueInputIndex}:a][ducked_bgm]amix=inputs=2:duration=first[out_audio]`;
  }

  /**
   * Mixes multiple audio tracks with speech ducking into a master AAC audio track.
   */
  static async mixTracks(
    dialoguePath: string,
    bgmPath: string | null,
    outputPath: string,
    config?: AudioDuckingConfig
  ): Promise<string> {
    if (!bgmPath || !fs.existsSync(bgmPath)) {
      // If no BGM, just copy/pass dialogue audio
      if (dialoguePath !== outputPath) {
        fs.copyFileSync(dialoguePath, outputPath);
      }
      return outputPath;
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
