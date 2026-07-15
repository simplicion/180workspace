'use strict';

const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs-extra");
const path = require("path");
require("dotenv").config();

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const uploadToR2 = async (filePath, key, contentType) => {
  try {
    const fileStream = fs.createReadStream(filePath);
    return await uploadBufferToR2(fileStream, key, contentType);
  } catch (error) {
    console.error(`[R2_UPLOAD_ERROR] Failed to upload ${key}:`, error);
    throw error;
  }
};

const uploadBufferToR2 = async (bufferOrStream, key, contentType) => {
  try {
    const parallelUploads3 = new Upload({
      client: r2Client,
      params: {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: bufferOrStream,
        ContentType: contentType,
        CacheControl: key.endsWith(".m3u8")
          ? "max-age=0, no-cache, no-store, must-revalidate"
          : "public, max-age=31536000, immutable",
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 5,
      leavePartsOnError: false,
    });

    await parallelUploads3.done();

    return {
      success: true,
      key,
      url: `${process.env.REELS_CDN_URL}/${key}`,
    };
  } catch (error) {
    console.error(`[R2_UPLOAD_BUFFER_ERROR] Failed to upload ${key}:`, error);
    throw error;
  }
};

const uploadDirectoryToR2 = async (dirPath, prefix) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const uploadPromises = entries.map(async (entry) => {
    const fullPath = path.join(dirPath, entry.name);
    const key = `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      return uploadDirectoryToR2(fullPath, key);
    } else {
      const contentType = entry.name.endsWith(".m3u8")
        ? "application/x-mpegURL"
        : entry.name.endsWith(".ts")
          ? "video/MP2T"
          : "application/octet-stream";
      return uploadToR2(fullPath, key, contentType);
    }
  });

  return Promise.all(uploadPromises);
};

const getPresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
};

const deleteFromR2 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return { success: true };
  } catch (error) {
    console.error(`[R2_DELETE_ERROR] Failed to delete ${key}:`, error);
    throw error;
  }
};

const deleteDirectoryFromR2 = async (prefix) => {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
    });
    const list = await r2Client.send(listCommand);
    if (!list.Contents || list.Contents.length === 0) return { success: true };

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: {
        Objects: list.Contents.map((obj) => ({ Key: obj.Key })),
      },
    });
    await r2Client.send(deleteCommand);
    return { success: true };
  } catch (error) {
    console.error(`[R2_DELETE_DIR_ERROR] Failed to delete prefix ${prefix}:`, error);
    throw error;
  }
};

const deleteStoryFilesFromR2 = async (story) => {
  if (!story) return;
  const { id, mediaUrl, rawMediaUrl } = story;
  try {
    const cdnBase = process.env.REELS_CDN_URL?.replace(/\/$/, "");

    const getKeyFromUrl = (url) => {
      if (!url) return null;
      if (cdnBase && url.startsWith(cdnBase)) {
        return url.slice(cdnBase.length + 1);
      }
      try {
        const u = new URL(url);
        return u.pathname.replace(/^\//, "");
      } catch (e) {
        return null;
      }
    };

    const urlsToDelete = [mediaUrl, rawMediaUrl];
    for (const url of urlsToDelete) {
      if (url && (url.includes("temp/stories") || url.includes("/stories/"))) {
        if (url.endsWith(".m3u8")) continue;
        const key = getKeyFromUrl(url);
        if (key) {
          console.log(`[R2_CLEANUP] Deleting story file: ${key}`);
          await deleteFromR2(key).catch((err) =>
            console.warn(`Failed to delete key ${key}: ${err.message}`)
          );
        }
      }
    }

    const hlsPrefix = `stories/${id}`;
    console.log(`[R2_CLEANUP] Deleting story directory: ${hlsPrefix}`);
    await deleteDirectoryFromR2(hlsPrefix).catch((err) =>
      console.warn(`Failed to delete directory prefix ${hlsPrefix}: ${err.message}`)
    );

    const thumbKey = `thumbnails/${id}.jpg`;
    console.log(`[R2_CLEANUP] Deleting story thumbnail: ${thumbKey}`);
    await deleteFromR2(thumbKey).catch((err) =>
      console.warn(`Failed to delete thumbnail ${thumbKey}: ${err.message}`)
    );
  } catch (error) {
    console.error(`Error deleting R2 files for story ${id}:`, error);
  }
};

module.exports = {
  r2Client,
  uploadToR2,
  uploadBufferToR2,
  uploadDirectoryToR2,
  getPresignedUploadUrl,
  deleteFromR2,
  deleteDirectoryFromR2,
  deleteStoryFilesFromR2
};
