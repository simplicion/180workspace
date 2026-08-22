import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

import { googleDriveService, uploadBufferToR2 } from '@workspace/integrations';

// In-memory storage — we primarily upload to cloud
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // increased to 25MB
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
            'video/webm', 'video/mp4'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type '${file.mimetype}' not allowed`) as any, false);
        }
    },
});

/**
 * Middleware to handle file uploads to preferred storage mode
 * Multi-company aware: fetches settings from req.prisma
 * @param folder - Target folder in storage (e.g. 'logos', 'expenses')
 * @param options - { isLogo: boolean }
 */
function handleUpload(folder: string = 'general', options: any = {}) {
    return async (req: any, res: Response, next: NextFunction) => {
        if (!req.file) return next();

        // Ensure company prisma client is present
        if (!req.prisma) {
            console.error('[Upload Middleware] Company Prisma client not found.');
            return res.status(500).json({ error: 'Company context missing for upload' });
        }


        try {
            const settings = await req.prisma.settings.findFirst() || {};
            
            // Merge company metadata to get storage credentials
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
            
            settings.metadata = metadata;
            settings.googleDriveServiceAccount = metadata.googleDriveServiceAccount || settings.googleDriveServiceAccount;
            settings.googleDriveFolderId = req.body.folderId || metadata.googleDriveFolderId || settings.googleDriveFolderId;

            // Check if it's a system asset that MUST go to R2
            const isSystemAsset = options.isLogo === true || folder === 'logos' || folder === 'employees' || options.forceR2 === true;
            
            let preferredMode = req.body.storageProvider || settings?.storageMode || 'r2';
            
            console.log(`[Upload DEBUG] folder: ${folder}, isSystemAsset: ${isSystemAsset}, preferredMode: ${preferredMode}`);

            let result = null;

            // --- FILE OPTIMIZATION ---
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
                    const ffmpeg = require('fluent-ffmpeg');
                    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
                    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
                    ffmpeg.setFfmpegPath(ffmpegPath);
                    ffmpeg.setFfprobePath(ffprobePath);

                    const tmpDir = path.join(__dirname, '../../../../../../uploads/temp');
                    if (!fs.existsSync(tmpDir)) {
                        fs.mkdirSync(tmpDir, { recursive: true });
                    }
                    const inputPath = path.join(tmpDir, `${Date.now()}-input-${req.file.originalname}`);
                    const outputPath = path.join(tmpDir, `${Date.now()}-output.mp4`);
                    fs.writeFileSync(inputPath, req.file.buffer);

                    const duration: number = await new Promise((resolve, reject) => {
                        ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
                            if (err) resolve(0);
                            else resolve(metadata.format.duration);
                        });
                    });

                    if (duration > 180) { // 3 minutes limit
                        fs.unlinkSync(inputPath);
                        return res.status(400).json({ error: 'Video exceeds maximum duration of 3 minutes' });
                    }

                    await new Promise((resolve, reject) => {
                        ffmpeg(inputPath)
                            .outputOptions([
                                '-vf scale=-2:360',
                                '-c:v libx264',
                                '-preset fast',
                                '-crf 28',
                                '-c:a aac',
                                '-b:a 128k'
                            ])
                            .save(outputPath)
                            .on('end', resolve)
                            .on('error', reject);
                    });

                    req.file.buffer = fs.readFileSync(outputPath);
                    req.file.mimetype = 'video/mp4';
                    req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, "") + ".mp4";

                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                }

            } catch (optErr: any) {
                console.warn('[Upload Middleware] Optimization failed, proceeding with original file:', optErr.message);
            }

            // --- STRICT ENFORCEMENT ---
            // --- STRICT ENFORCEMENT ---
            // If it's NOT a system asset, verify company has configured their own storage
            if (!isSystemAsset && preferredMode !== 'r2') {
                const isDriveConfigured = !!(settings.googleDriveServiceAccount || metadata.googleDriveTokens);

                if ((preferredMode === 'google_drive' && !isDriveConfigured) ||
                    preferredMode === 'local' ||
                    preferredMode === 'cloudinary') {
                    console.log(`[Upload DEBUG] Storage provider '${preferredMode}' not configured or unsupported. Falling back to 'r2' storage.`);
                    preferredMode = 'r2';
                }
            }

            // Force R2 for everything to use centralized storage
            preferredMode = 'r2';
            let isDriveConfigured = false;
            // Trigger backend restart after integrations build

            // Attempt Preferred Storage for Non-System Assets
            // (Skipped, since we force R2)

            // Fallback to R2 if no result yet
            if (!result) {
                try {
                    const companyId = req.user?.companyId || settings.companyId;
                    if (companyId) {
                        const { SubscriptionService } = require('@workspace/platform-billing');
                        const subscriptionService = new SubscriptionService();
                        const limits = await subscriptionService.getSubscriptionLimits(companyId);
                        if (limits) {
                            const newTotal = (limits.storageUsedBytes || 0) + req.file.buffer.length;
                            if (newTotal > limits.maxStorageBytes) {
                                return res.status(402).json({
                                    error: 'Storage Limit Exceeded',
                                    message: 'Your R2 storage limit has been exceeded. Please add more storage or upgrade your plan.',
                                    code: 'STORAGE_FULL'
                                });
                            }
                        }
                    }

                    const extension = req.file.originalname.split('.').pop();
                    const r2Key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
                    const r2Result = await uploadBufferToR2(req.file.buffer, r2Key, req.file.mimetype);
                    result = {
                        fileUrl: r2Result.url,
                        fileId: r2Result.key,
                        storageType: 'r2'
                    };

                    if (companyId) {
                        const { prisma } = require('@workspace/db');
                        await prisma.companyConfig.update({
                            where: { companyId },
                            data: {
                                storageUsedBytes: {
                                    increment: req.file.buffer.length
                                }
                            }
                        });
                    }
                } catch (err: any) {
                    console.error('[Upload Middleware] R2 upload failed:', err);
                    return res.status(500).json({ 
                        error: 'UPLOAD_FAILED', 
                        message: 'Storage providers failed to process the file. R2 Error: ' + err.message,
                        details: err.stack
                    });
                }
            }

            // FINAL CHECK: If no storage succeeded and it's NOT a logo, we fail (Strict Policy)
            if (!result) {
                return res.status(500).json({ 
                    error: 'UPLOAD_FAILED', 
                    message: 'Storage providers failed to process the file. No result was generated.' 
                });
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
