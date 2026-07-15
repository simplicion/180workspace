'use strict';

require("dotenv").config();
const { prisma } = require("@workspace/db");
const { processMediaVideo } = require('../../utils/reelWorker');
const { getIo } = require('../../sockets/index');
const Sentry = require("../../config/sentry");
const { deleteFromR2 } = require('../../utils/r2');

const MODEL_MAP = {
  reel: "reel",
  story: "story",
  community: "forumPost", // Using forumPost per existing codebase
};

async function mediaProcessor(job) {
  const { mediaId, mediaType, localPath } = job.data;
  const prismaModel = MODEL_MAP[mediaType];

  if (!prismaModel) {
    throw new Error(
      `Invalid media type: "${mediaType}". Expected one of: ${Object.keys(MODEL_MAP).join(", ")}`
    );
  }

  const Model = prisma[prismaModel];

  // 1. Fetch media record
  const media = await Model.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw new Error(`[PROCESSOR] ${mediaType} "${mediaId}" not found in database.`);
  }

  // Snapshot raw URL NOW before we null it â€” needed for R2 cleanup after transcoding
  const rawSourceUrl = media.rawVideoUrl || media.rawMediaUrl || null;

  // 2. Mark as processing
  await Model.update({
    where: { id: mediaId },
    data: { status: "PROCESSING" },
  });

  try {
    // 3. Transcode
    const result = await processMediaVideo(media, mediaType, localPath);

    // 4. Update DB: mark ready + clear raw URL
    const updateData = {
      status: mediaType === "community" ? "active" : "PUBLISHED", // or ready depending on DB enum
      hlsUrl: result.hlsUrl,
      thumbnailUrl: result.thumbnailUrl,
    };

    if (mediaType === "reel") {
      updateData.rawVideoUrl = null;
    } else if (mediaType === "story") {
      updateData.rawMediaUrl = null;
      updateData.mediaUrl = result.hlsUrl;
    } else if (mediaType === "community") {
      updateData.rawVideoUrl = null;
      // Do not overwrite mediaUrls for community posts as they might have other attachments,
      // and HLS URL is stored in hlsUrl. We can just null rawVideoUrl.
    }

    await Model.update({ where: { id: mediaId }, data: updateData });

    // 5. Delete raw temp file from R2
    if (rawSourceUrl) {
      try {
        const cdnBase = process.env.REELS_CDN_URL?.replace(/\/$/, "");
        let rawKey = null;

        if (cdnBase && rawSourceUrl.startsWith(cdnBase)) {
          rawKey = rawSourceUrl.slice(cdnBase.length + 1);
        } else {
          const url = new URL(rawSourceUrl);
          rawKey = url.pathname.replace(/^\//, "");
        }

        if (rawKey) {
          console.log(`[PROCESSOR] Deleting raw source from R2: ${rawKey}`);
          await deleteFromR2(rawKey);
          console.log(`[PROCESSOR] Raw source deleted: ${rawKey}`);
        }
      } catch (cleanupErr) {
        console.warn(`[PROCESSOR] R2 raw file cleanup failed (non-fatal): ${cleanupErr.message}`);
      }
    }

    // 6. Notify creator via Socket.io
    const io = getIo();
    if (io) {
      const userId = media.userId || media.creatorId || media.authorId;
      if (userId) {
        io.to(`user:${userId}`).emit("MEDIA_PROCESSING_COMPLETE", {
          mediaId,
          mediaType,
          hlsUrl: result.hlsUrl,
          thumbnailUrl: result.thumbnailUrl,
        });
        console.log(`[PROCESSOR] MEDIA_PROCESSING_COMPLETE emitted to room user:${userId}`);
      }
    }

    console.log(`[PROCESSOR] Successfully processed ${mediaType}: ${mediaId}`);
    return result;
  } catch (error) {
    console.error(`[PROCESSOR] Error processing ${mediaType} "${mediaId}":`, error);

    Sentry.captureException(error, {
      extra: { mediaId, mediaType, jobId: job.id, attempt: job.attemptsMade },
    });

    try {
      await Model.update({
        where: { id: mediaId },
        data: { status: "FAILED" },
      });
    } catch (dbErr) {
      console.error(`[PROCESSOR] Failed to update status to "FAILED" for ${mediaId}:`, dbErr);
    }

    throw error;
  }
}

module.exports = mediaProcessor;
