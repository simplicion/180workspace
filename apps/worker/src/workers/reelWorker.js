'use strict';

const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const axios = require("axios");
const { uploadDirectoryToR2, uploadToR2 } = require('../../../backend/src/platform-core/platform-storage/services/r2');
const { getIo } = require('../../../backend/src/system-configs/sockets/index');

// Tell fluent-ffmpeg where to find the static binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const RENDITIONS = [
  {
    resolution: "360p",
    width: 360,
    height: 640,
    bitrate: "800k",
    bufsize: "1200k",
    maxrate: "850k",
  },
  {
    resolution: "480p",
    width: 480,
    height: 854,
    bitrate: "1400k",
    bufsize: "2100k",
    maxrate: "1500k",
  },
  {
    resolution: "720p",
    width: 720,
    height: 1280,
    bitrate: "2800k",
    bufsize: "4200k",
    maxrate: "3000k",
  },
];

const processMediaVideo = async (media, mediaType, localPath = null) => {
  const tempId = `media_${media.id}_${Date.now()}`;
  const tempDir = path.join(os.tmpdir(), tempId);

  const downloadedInputPath = path.join(tempDir, "input.mp4");
  const inputPath = localPath || downloadedInputPath;
  const outputDir = path.join(tempDir, "output");
  const thumbnailPath = path.join(tempDir, "thumbnail.jpg");

  try {
    console.log(`[WORKER] [${media.id}] Starting ABR pipeline for ${mediaType}...`);
    await fs.ensureDir(tempDir);
    await fs.ensureDir(outputDir);

    const sourceUrl = media.rawVideoUrl || media.rawMediaUrl || null;

    // 1. Download raw video from R2 (cloud-upload flow)
    if (!localPath) {
      if (!sourceUrl) {
        throw new Error(`[WORKER] [${media.id}] No source video URL found â€” rawVideoUrl is null.`);
      }
      console.log(`[WORKER] [${media.id}] Downloading raw video from: ${sourceUrl}`);
      const response = await axios({
        url: sourceUrl,
        method: "GET",
        responseType: "stream",
        timeout: 300_000, 
      });
      const writer = fs.createWriteStream(downloadedInputPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        response.data.on("error", reject);
      });
      console.log(`[WORKER] [${media.id}] Download complete.`);
    }

    // 2. Probe metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) reject(new Error(`ffprobe failed: ${err.message}`));
        else resolve(data);
      });
    });

    const duration = metadata.format?.duration || 0;
    const videoStream = metadata.streams?.find((s) => s.codec_type === "video");
    if (!videoStream) {
      throw new Error(`[WORKER] [${media.id}] No video stream found in input file.`);
    }
    const { width = 720, height = 1280 } = videoStream;
    const aspectRatio = width / height;

    console.log(`[WORKER] [${media.id}] Probed: ${width}x${height}, duration=${duration}s`);

    // 3. Generate Thumbnail
    console.log(`[WORKER] [${media.id}] Generating thumbnail...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ["1"],
          filename: "thumbnail.jpg",
          folder: tempDir,
          size: "720x?",
        })
        .on("end", resolve)
        .on("error", (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)));
    });

    // 4. Multi-Variant Transcoding
    console.log(`[WORKER] [${media.id}] Transcoding ABR ladder (${RENDITIONS.map((r) => r.resolution).join(", ")})...`);

    const io = getIo();
    const userId = media.userId || media.creatorId || media.adminId;
    const userRoom = userId ? `user:${userId}` : null; // Added 'user:' prefix to match backend rooms

    const modelPrefix =
      mediaType === "community"
        ? "community"
        : mediaType === "story"
          ? "stories"
          : "reels";

    let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";

    for (let i = 0; i < RENDITIONS.length; i++) {
      const rendition = RENDITIONS[i];
      const renditionDir = path.join(outputDir, rendition.resolution);
      await fs.ensureDir(renditionDir);

      console.log(`[WORKER] [${media.id}] Encoding ${rendition.resolution}...`);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            "-vcodec libx264",
            "-crf 26",
            "-preset veryfast",
            `-b:v ${rendition.bitrate}`,
            `-maxrate ${rendition.maxrate}`,
            `-bufsize ${rendition.bufsize}`,
            "-pix_fmt yuv420p",
            `-vf scale=w=${rendition.width}:h=-2`,
            "-profile:v main",
            "-level 3.1",
            "-acodec aac",
            "-ar 44100",
            "-b:a 128k",
            "-start_number 0",
            "-hls_time 4",
            "-hls_list_size 0",
            "-hls_segment_type mpegts",
            "-hls_segment_filename",
            path.join(renditionDir, "segment_%03d.ts"),
            "-f hls",
          ])
          .output(path.join(renditionDir, "playlist.m3u8"))
          .on("progress", (progress) => {
            const renditionProgress = Math.min(Math.max(progress.percent || 0, 0), 100);
            const totalProgress = Math.round((i / RENDITIONS.length) * 100 + renditionProgress / RENDITIONS.length);

            if (io && userRoom) {
              io.to(userRoom).emit("MEDIA_PROCESSING_PROGRESS", {
                mediaId: media.id,
                mediaType,
                progress: totalProgress,
                status: `Optimizing ${rendition.resolution}...`,
              });
            }
          })
          .on("end", resolve)
          .on("error", (err) => reject(new Error(`Encoding ${rendition.resolution} failed: ${err.message}`)))
          .run();
      });

      const bandwidth = parseInt(rendition.bitrate) * 1000;
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rendition.width}x${rendition.height}\n${rendition.resolution}/playlist.m3u8\n`;
    }

    await fs.writeFile(path.join(outputDir, "master.m3u8"), masterPlaylist);

    // 5. Upload HLS to R2
    const r2Prefix = `${modelPrefix}/${media.id}`;
    console.log(`[WORKER] [${media.id}] Uploading HLS to R2 prefix: ${r2Prefix}`);
    await uploadDirectoryToR2(outputDir, r2Prefix);

    // 6. Upload Thumbnail to R2
    const thumbKey = `thumbnails/${media.id}.jpg`;
    const thumbResult = await uploadToR2(thumbnailPath, thumbKey, "image/jpeg");

    const hlsUrl = `${process.env.REELS_CDN_URL}/${r2Prefix}/master.m3u8`;
    console.log(`[WORKER] [${media.id}] Pipeline complete. HLS: ${hlsUrl}`);

    return {
      hlsUrl,
      thumbnailUrl: thumbResult.url,
      duration,
      aspectRatio,
      width,
      height,
    };
  } catch (error) {
    console.error(`[WORKER] [${media.id}] Pipeline error:`, error);
    throw error;
  } finally {
    await fs.remove(tempDir).catch((e) => console.warn(`[WORKER] [${media.id}] Temp dir cleanup failed: ${e.message}`));
    if (localPath) {
      await fs.remove(localPath).catch((e) => console.warn(`[WORKER] [${media.id}] Local file cleanup failed: ${e.message}`));
    }
  }
};

module.exports = { processMediaVideo };

