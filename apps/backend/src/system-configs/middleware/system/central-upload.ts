import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

import { googleDriveService, uploadBufferToR2 } from '@workspace/integrations';

// @ts-ignore
const ffmpeg = require('fluent-ffmpeg');
// @ts-ignore
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
// @ts-ignore
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// In-memory storage - 50MB max to accommodate videos
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip', 'application/x-zip-compressed',
            'text/plain', 'text/csv', 'text/markdown', 'application/rtf',
            'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav',
            'video/webm', 'video/mp4', 'video/quicktime'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type '${file.mimetype}' not allowed`) as any, false);
        }
    },
});

function handleUpload(folder: string = 'general', options: any = {}) {
    return async (req: any, res: Response, next: NextFunction) => {
        if (!req.file) return next();

        if (!req.prisma) {
            console.error('[Upload Middleware] Company Prisma client not found.');
            return res.status(500).json({ error: 'Company context missing for upload' });
        }

        try {
            const settings = await req.prisma.settings.findFirst() || {};
            let metadata: any = {};
            
            if (req.user?.companyId || settings.companyId) {
                const { prisma } = require('@workspace/db');
                const company = await prisma.company.findUnique({
                    where: { id: req.user?.companyId || settings.companyId }
                });
                if (company && company.metadata) {
                    metadata = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : company.metadata;
                }
            }

            // Force R2 for centralized pipeline
            let result = null;

            try {
                if (req.file.mimetype.startsWith('image/') && req.file.mimetype !== 'image/gif' && req.file.mimetype !== 'image/svg+xml') {
                    const sharp = require('sharp');
                    req.file.buffer = await sharp(req.file.buffer)
                        .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toBuffer();
                    req.file.mimetype = 'image/webp';
                    req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, "") + ".webp";
                } else if (req.file.mimetype.startsWith('video/')) {
                    const isStreaming = req.query.streaming === 'true' || req.body.streaming === 'true' || options.streaming === true;
                    
                    const tmpDir = path.join(__dirname, '../../../../../../uploads/temp/video-process');
                    if (!fs.existsSync(tmpDir)) {
                        fs.mkdirSync(tmpDir, { recursive: true });
                    }
                    
                    const videoId = uuidv4();
                    const inputPath = path.join(tmpDir, `${videoId}-input${path.extname(req.file.originalname) || '.mp4'}`);
                    fs.writeFileSync(inputPath, req.file.buffer);

                    const duration: number = await new Promise((resolve) => {
                        ffmpeg.ffprobe(inputPath, (err: any, meta: any) => {
                            if (err) resolve(0);
                            else resolve(meta.format.duration);
                        });
                    });

                    if (isStreaming) {
                        // HLS streaming logic
                        if (duration > 30) {
                            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                            return res.status(400).json({ error: 'Video exceeds maximum duration of 30 seconds for HLS streaming' });
                        }

                        const outputDir = path.join(tmpDir, videoId);
                        fs.mkdirSync(outputDir, { recursive: true });
                        const playlistName = 'master.m3u8';
                        const outputPath = path.join(outputDir, playlistName);

                        await new Promise((resolve, reject) => {
                            ffmpeg(inputPath)
                                .outputOptions([
                                    '-profile:v baseline', '-level 3.0',
                                    '-s 640x360', '-start_number 0',
                                    '-hls_time 4', '-hls_list_size 0', '-f hls'
                                ])
                                .output(outputPath)
                                .on('end', resolve)
                                .on('error', reject)
                                .run();
                        });

                        const filesToUpload = fs.readdirSync(outputDir);
                        let masterPlaylistUrl: string | null = null;
                        
                        const uploadPromises = filesToUpload.map(async (file: string) => {
                            const filePath = path.join(outputDir, file);
                            const fileBuffer = fs.readFileSync(filePath);
                            const ext = path.extname(file);
                            const contentType = ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : 
                                              ext === '.ts' ? 'video/MP2T' : 'application/octet-stream';
                            
                            const r2Key = `videos/${videoId}/${file}`;
                            const r2Result = await uploadBufferToR2(fileBuffer, r2Key, contentType);
                            
                            if (file === playlistName) masterPlaylistUrl = r2Result.url;
                            return r2Result;
                        });

                        await Promise.all(uploadPromises);

                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });

                        if (!masterPlaylistUrl) throw new Error('Failed to upload HLS playlist');

                        result = {
                            fileUrl: masterPlaylistUrl,
                            fileId: videoId,
                            storageType: 'r2-hls'
                        };

                    } else {
                        // Standard MP4 encoding logic
                        if (duration > 180) {
                            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                            return res.status(400).json({ error: 'Video exceeds maximum duration of 3 minutes' });
                        }

                        const outputPath = path.join(tmpDir, `${videoId}-output.mp4`);
                        await new Promise((resolve, reject) => {
                            ffmpeg(inputPath)
                                .outputOptions([
                                    '-vf scale=-2:360', '-c:v libx264',
                                    '-preset fast', '-crf 28', '-c:a aac', '-b:a 128k'
                                ])
                                .save(outputPath)
                                .on('end', resolve)
                                .on('error', reject);
                        });

                        req.file.buffer = fs.readFileSync(outputPath);
                        req.file.mimetype = 'video/mp4';
                        req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, "") + ".mp4";

                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    }
                }
            } catch (optErr: any) {
                console.warn('[Upload Middleware] Optimization failed, proceeding with original file:', optErr.message);
            }

            if (!result) {
                // If it wasn't processed as HLS above, upload the processed buffer to R2
                const companyId = req.user?.companyId || settings.companyId;
                const extension = req.file.originalname.split('.').pop();
                const r2Key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
                const r2Result = await uploadBufferToR2(req.file.buffer, r2Key, req.file.mimetype);
                
                result = {
                    fileUrl: r2Result.url,
                    fileId: r2Result.key,
                    storageType: 'r2'
                };
            }

            if (!result) {
                return res.status(500).json({ 
                    error: 'UPLOAD_FAILED', 
                    message: 'Storage providers failed to process the file. No result was generated.' 
                });
            }

            // Update storage metrics
            const companyId = req.user?.companyId || settings.companyId;
            if (companyId && req.file && req.file.buffer) {
                const { prisma } = require('@workspace/db');
                await prisma.companyConfig.update({
                    where: { companyId },
                    data: {
                        storageUsedBytes: {
                            increment: req.file.buffer.length
                        }
                    }
                }).catch((e: any) => console.error('Failed to update storage metrics:', e));
            }

            req.storageResult = result;
            next();
        } catch (err) {
            console.error('[Upload Middleware] Fatal error:', err);
            next(err);
        }
    };
}

export { upload, handleUpload };
