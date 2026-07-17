'use strict';

const multer = require('multer');
const { uploadToCloudinary } = require('../../config/cloudinary');
const googleDriveService = require('../../../platform-core/platform-storage/services/google-drive.service');
const { uploadBufferToR2 } = require('../../../platform-core/platform-storage/services/r2');
const fs = require('fs');
const path = require('path');

// In-memory storage â€” we primarily upload to cloud
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv',
            'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav',
            'video/webm', 'video/mp4'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type '${file.mimetype}' not allowed`), false);
        }
    },
});

/**
 * Middleware to handle file uploads to preferred storage mode
 * Multi-tenant aware: fetches settings from req.prisma
 * @param {string} folder - Target folder in storage (e.g. 'logos', 'expenses')
 * @param {Object} options - { isLogo: boolean }
 */
function handleUpload(folder = 'general', options = {}) {
    return async (req, res, next) => {
        if (!req.file) return next();

        // Ensure tenantDb is present
        if (!req.prisma) {
            console.error('[Upload Middleware] tenantDb not found.');
            return res.status(500).json({ error: 'Tenant context missing for upload' });
        }

        try {
            const settings = await req.prisma.settings.findFirst() || {};
            
            // Merge company metadata to get storage credentials
            let metadata = {};
            if (req.user?.companyId || settings.companyId) {
                const { prisma } = require('@workspace/db');
                const company = await prisma.company.findUnique({
                    where: { id: req.user?.companyId || settings.companyId }
                });
                if (company && company.metadata) {
                    metadata = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : company.metadata;
                }
            }
            
            settings.googleDriveServiceAccount = metadata.googleDriveServiceAccount || settings.googleDriveServiceAccount;
            settings.googleDriveFolderId = metadata.googleDriveFolderId || settings.googleDriveFolderId;
            settings.cloudinaryCloudName = metadata.cloudinaryCloudName || settings.cloudinaryCloudName;
            settings.cloudinaryApiKey = metadata.cloudinaryApiKey || settings.cloudinaryApiKey;
            settings.cloudinaryApiSecret = metadata.cloudinaryApiSecret || settings.cloudinaryApiSecret;

            // Check if it's a system asset that MUST go to R2
            const isSystemAsset = options.isLogo === true || folder === 'logos' || folder === 'employees' || options.forceR2 === true;
            
            const preferredMode = settings?.storageMode || 'cloudinary';
            
            console.log(`[Upload DEBUG] folder: ${folder}, isSystemAsset: ${isSystemAsset}, preferredMode: ${preferredMode}`);

            let result = null;

            // --- STRICT ENFORCEMENT ---
            // If it's NOT a system asset, verify tenant has configured their own storage
            if (!isSystemAsset) {
                const isCloudinaryConfigured = !!(settings.cloudinaryCloudName && settings.cloudinaryApiKey && settings.cloudinaryApiSecret);
                const isDriveConfigured = !!settings.googleDriveServiceAccount;

                if ((preferredMode === 'cloudinary' && !isCloudinaryConfigured) || 
                    (preferredMode === 'google_drive' && !isDriveConfigured) ||
                    preferredMode === 'local') {
                    return res.status(403).json({ 
                        error: 'STORAGE_NOT_CONFIGURED', 
                        message: 'Corporate data security policy requires your own Cloud Storage (Google Drive or Cloudinary) to be configured in Settings before uploading documents, expenses, or photos.' 
                    });
                }
            }

            // Attempt Preferred Storage for Non-System Assets
            if (!isSystemAsset && preferredMode === 'google_drive' && settings.googleDriveServiceAccount) {
                try {
                    const driveResult = await googleDriveService.uploadFile(req.file.buffer, {
                        name: req.file.originalname,
                        mimeType: req.file.mimetype,
                    }, settings);

                    result = {
                        fileUrl: driveResult.webViewLink || driveResult.webContentLink,
                        fileId: driveResult.id,
                        storageType: 'google_drive'
                    };
                } catch (err) {
                    console.warn('[Upload Middleware] Google Drive upload failed:', err.message);
                }
            } 
            
            if (!isSystemAsset && !result && preferredMode === 'cloudinary') {
                try {
                    const config = {
                        cloudName: settings.cloudinaryCloudName,
                        apiKey: settings.cloudinaryApiKey,
                        apiSecret: settings.cloudinaryApiSecret
                    };

                    const cloudResult = await uploadToCloudinary(req.file.buffer, {
                        folder: `ims/${folder}`,
                        resourceType: req.file.mimetype.startsWith('image') ? 'image' : 'raw',
                        config
                    });
                    result = {
                        fileUrl: cloudResult.secure_url,
                        fileId: cloudResult.public_id,
                        storageType: 'cloudinary'
                    };
                } catch (err) {
                    console.warn('[Upload Middleware] Cloudinary upload failed:', err.message);
                }
            }

            // Fallback to R2 if no result yet
            if (!result) {
                try {
                    const extension = req.file.originalname.split('.').pop();
                    const r2Key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
                    const r2Result = await uploadBufferToR2(req.file.buffer, r2Key, req.file.mimetype);
                    result = {
                        fileUrl: r2Result.url,
                        fileId: r2Result.key,
                        storageType: 'r2'
                    };
                } catch (err) {
                    console.warn('[Upload Middleware] R2 upload failed:', err.message);
                }
            }

            // FINAL CHECK: If no storage succeeded and it's NOT a logo, we fail (Strict Policy)
            if (!result) {
                return res.status(500).json({ 
                    error: 'UPLOAD_FAILED', 
                    message: 'Storage providers failed to process the file. Please check your storage credentials in Settings.' 
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

module.exports = { upload, handleUpload };
