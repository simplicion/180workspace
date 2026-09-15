import ffmpeg from "./ffmpeg-setup";
import { MediaAssetDescriptor } from "@workspace/video-contracts";
import * as crypto from "crypto";
import * as fs from "fs";

export class MediaProber {
  static async probeFile(filePath: string): Promise<MediaAssetDescriptor> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Media file not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const sha256Hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: Error | null, metadata: any) => {
        if (err) {
          return reject(err);
        }

        const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
        const audioStream = metadata.streams?.find((s: any) => s.codec_type === "audio");

        const width = videoStream?.width || 1920;
        const height = videoStream?.height || 1080;
        const durationSeconds = metadata.format?.duration || 0;

        let fps = 30;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
          if (num && den) fps = num / den;
        }

        const descriptor: MediaAssetDescriptor = {
          id: crypto.randomUUID(),
          name: filePath.split(/[\/\\]/).pop() || "unknown",
          filePath,
          fileSizeBytes: stats.size,
          mimeType: "video/mp4",
          durationSeconds,
          width,
          height,
          fps,
          hasAudio: !!audioStream,
          codecVideo: videoStream?.codec_name,
          codecAudio: audioStream?.codec_name,
          sha256Hash,
        };

        resolve(descriptor);
      });
    });
  }
}
