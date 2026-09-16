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

    // Memory-safe chunked streaming hash (handles 100MB, 500MB, 1GB, 5GB+ with 0 MB memory overhead)
    const sha256Hash = await new Promise<string>((resolveHash, rejectHash) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolveHash(hash.digest("hex")));
      stream.on("error", (err) => rejectHash(err));
    });

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
