import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// @ts-ignore
const ffmpeg = require('fluent-ffmpeg');
// @ts-ignore
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
// @ts-ignore
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
import { uploadBufferToR2 } from '@workspace/integrations';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Standard multer in-memory storage for the initial upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for raw video upload
    },
});

const handleVideoUpload = async (req: any, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }

        if (!req.file.mimetype.startsWith('video/')) {
            return res.status(400).json({ error: 'File is not a video' });
        }

        const tmpDir = path.join(__dirname, '../../../../../../uploads/temp/hls');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const videoId = uuidv4();
        const inputPath = path.join(tmpDir, `${videoId}-input${path.extname(req.file.originalname) || '.mp4'}`);
        const outputDir = path.join(tmpDir, videoId);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(inputPath, req.file.buffer);

        const duration: number = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
                if (err) resolve(0);
                else resolve(metadata.format.duration);
            });
        });

        if (duration > 30) {
            fs.unlinkSync(inputPath);
            fs.rmSync(outputDir, { recursive: true, force: true });
            return res.status(400).json({ error: 'Video exceeds maximum duration of 30 seconds' });
        }

        // HLS encoding
        const playlistName = 'master.m3u8';
        const outputPath = path.join(outputDir, playlistName);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-profile:v baseline', // baseline profile for compatibility
                    '-level 3.0',
                    '-s 640x360', // downscale to 360p
                    '-start_number 0',
                    '-hls_time 4', // 4 second chunks
                    '-hls_list_size 0',
                    '-f hls'
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Storage check before uploading to R2
        const companyId = req.user?.companyId;
        if (companyId) {
            const { BillingService } = require('@workspace/platform-billing');
            const limits = await BillingService.getSubscriptionLimits(companyId);
            if (limits) {
                // Calculate total size of chunks
                const filesToUpload = fs.readdirSync(outputDir);
                let totalBytes = 0;
                for (const file of filesToUpload) {
                    const filePath = path.join(outputDir, file);
                    totalBytes += fs.statSync(filePath).size;
                }

                const newTotal = (limits.storageUsedBytes || 0) + totalBytes;
                if (newTotal > limits.maxStorageBytes) {
                    fs.unlinkSync(inputPath);
                    fs.rmSync(outputDir, { recursive: true, force: true });
                    return res.status(402).json({
                        error: 'Storage Limit Exceeded',
                        message: 'Your R2 storage limit has been exceeded. Please add more storage or upgrade your plan.',
                        code: 'STORAGE_FULL'
                    });
                }
            }
        }

        // Upload all generated files to R2
        const filesToUpload = fs.readdirSync(outputDir);
        let masterPlaylistUrl: string | null = null;
        let totalUploadedBytes = 0;
        
        const uploadPromises = filesToUpload.map(async (file: string) => {
            const filePath = path.join(outputDir, file);
            const fileBuffer = fs.readFileSync(filePath);
            totalUploadedBytes += fileBuffer.length;
            const ext = path.extname(file);
            const contentType = ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : 
                              ext === '.ts' ? 'video/MP2T' : 'application/octet-stream';
            
            const r2Key = `videos/${videoId}/${file}`;
            const r2Result = await uploadBufferToR2(fileBuffer, r2Key, contentType);
            
            if (file === playlistName) {
                masterPlaylistUrl = r2Result.url;
            }
            
            return r2Result;
        });

        await Promise.all(uploadPromises);

        if (companyId && totalUploadedBytes > 0) {
            const { prisma } = require('@workspace/db');
            await prisma.companyConfig.update({
                where: { companyId },
                data: {
                    storageUsedBytes: {
                        increment: totalUploadedBytes
                    }
                }
            });
        }

        // Cleanup temp files
        fs.unlinkSync(inputPath);
        fs.rmSync(outputDir, { recursive: true, force: true });

        if (!masterPlaylistUrl) {
            return res.status(500).json({ error: 'Failed to upload HLS playlist' });
        }

        req.storageResult = {
            fileUrl: masterPlaylistUrl,
            fileId: videoId,
            storageType: 'r2-hls'
        };

        next();
    } catch (err) {
        console.error('[Video Upload Middleware] Error:', err);
        next(err);
    }
};

export { upload, handleVideoUpload };
