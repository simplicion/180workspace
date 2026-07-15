'use strict';

const googleDriveService = require('../services/google-drive.service');
const AutomationService = require('../../platform-communications/services/automation.service');
const AIAutomationService = require('../../../app-registry/productivity-tools-app/ai-assistant/ai-automation.service.js');

exports.uploadFile = async (req, res, next) => {
    try {
        if (!req.storageResult) {
            return res.status(400).json({ error: 'File upload failed â€” Storage not configured' });
        }

        const Document = req.prisma.document;
        const Project = req.prisma.project;
        const Settings = req.prisma.settings;

        const userId = req.user.id;
        const companyId = req.user.companyId;

        let taggedUsers = [];
        try {
            if (req.body.taggedUsers) {
                taggedUsers = typeof req.body.taggedUsers === 'string' ? JSON.parse(req.body.taggedUsers) : req.body.taggedUsers;
            }
        } catch (e) {
            console.error('Error parsing taggedUsers in uploadFile:', e);
        }

        const { name, relatedId, relatedModel, description, tags, isConfidential, folder: bodyFolder } = req.body;

        // Tags parsing
        let tagList = [];
        try {
            if (tags) {
                tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;
            }
        } catch (e) {
            console.error('Error parsing tags in uploadFile:', e);
        }

        // Hierarchical Organization
        let hierarchicalFolder = bodyFolder || 'company/general';
        if (relatedModel === 'Project' && relatedId) {
            const project = await Project.findUnique({ where: { id: relatedId } });
            if (project) {
                const clientId = project.clientIds && project.clientIds.length > 0 ? project.clientIds[0] : 'public';
                hierarchicalFolder = `company/clients/${clientId}/${project.id}/documents`;
            }
        }

        const doc = await Document.create({ data: {
            name: name || req.file.originalname,
            fileUrl: req.storageResult.fileUrl,
            fileId: req.storageResult.fileId,
            storageType: req.storageResult.storageType,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            folder: hierarchicalFolder,
            uploadedById: userId,
            companyId: companyId,
            relatedId: relatedId || null,
            relatedModel: relatedModel || '',
            description: description || '',
            tags: tagList,
            isConfidential: isConfidential === 'true' || isConfidential === true,
            isLinkOnly: false
        } });

        // Trigger Automation for file upload
        await AutomationService.trigger({
            eventType: 'document_uploaded',
            triggeredBy: userId,
            relatedItem: { itemId: doc.id, itemModel: 'Document' },
            description: `Document "${doc.name}" was uploaded to: ${doc.folder}`,
            metadata: { fileName: doc.name, folder: doc.folder, fileUrl: doc.fileUrl }
        }, req.prisma);

        // Trigger AI classification (Async)
        (async () => {
            try {
                const settings = await Settings.findFirst({ where: { companyId } });
                const aiResult = await AIAutomationService.classifyDocument(doc.description || doc.name, settings);
                if (aiResult.category && aiResult.category !== 'General') {
                    await Document.update({ where: { id: doc.id }, data: { category: aiResult.category } });
                }
            } catch (e) {
                console.error('AI Classification Error:', e.message);
            }
        })();

        // Handle tagged users
        if (taggedUsers.length > 0) {
            for (const tUserId of taggedUsers) {
                await AutomationService.trigger({
                    eventType: 'document_shared',
                    triggeredBy: userId,
                    targetUser: tUserId,
                    relatedItem: { itemId: doc.id, itemModel: 'Document' },
                    description: `${req.user.name} shared a document with you: ${doc.name}`,
                    metadata: { fileName: doc.name, fileUrl: doc.fileUrl }
                }, req.prisma);
            }
        }

        const storageMsg = req.storageResult.isFallback
            ? `NOTE: Cloud storage unavailable. File stored securely on local system: ${req.storageResult.fileId}`
            : `File stored successfully on ${req.storageResult.storageType === 'google_drive' ? 'Google Drive' : 'Cloudinary'}`;

        res.status(201).json({
            document: doc,
            url: doc.fileUrl,
            message: storageMsg
        });
    } catch (err) { next(err); }
};

exports.addFileLink = async (req, res, next) => {
    try {
        const Document = req.prisma.document;
        const userId = req.user.id;
        const { name, fileUrl, folder = 'general', relatedId, relatedModel, description, tags, isConfidential, category = 'General' } = req.body;
        if (!fileUrl) return res.status(400).json({ error: 'File URL is required' });

        const doc = await Document.create({ data: {
            name,
            fileUrl,
            fileId: '',
            storageType: 'external',
            fileType: 'link',
            fileSize: 0,
            folder,
            category,
            uploadedById: userId,
            companyId: req.user.companyId,
            relatedId: relatedId || null,
            relatedModel: relatedModel || '',
            description: description || '',
            tags: tags || [],
            isConfidential: !!isConfidential,
            isLinkOnly: true
        } });
        res.status(201).json({ document: doc });
    } catch (err) { next(err); }
};

exports.getFiles = async (req, res, next) => {
    try {
        const Document = req.prisma.document;
        const { folder, relatedId, relatedModel, tags, search } = req.query;
        const query = { deletedAt: null, companyId: req.user.companyId };

        if (folder) query.folder = folder;
        if (relatedId) query.relatedId = relatedId;
        if (relatedModel) query.relatedModel = relatedModel;

        if (tags) {
            const tagList = Array.isArray(tags) ? tags : tags.split(',');
            query.tags = { hasSome: tagList };
        }

        if (search) {
            query.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        // RBAC: Non-admin/finance users shouldn't see confidential docs
        const authUser = req.user;
        const hasFullAccess = authUser.roles && (authUser.roles.includes('admin') || authUser.roles.includes('finance') || authUser.roles.includes('manager'));
        const isPrivileged = ['admin', 'manager', 'finance'].includes(authUser.role || '');

        if (!hasFullAccess && !isPrivileged) {
            query.isConfidential = false;
        }

        const files = await Document.findMany({
            where: query,
            include: {
                uploadedBy: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ files });
    } catch (err) { next(err); }
};

exports.deleteFile = async (req, res, next) => {
    try {
        const Document = req.prisma.document;
        const Settings = req.prisma.settings;

        const doc = await Document.findUnique({ where: { id: req.params.id } });
        if (!doc) return res.status(404).json({ error: 'File not found' });

        if (doc.storageType === 'google_drive') {
            try {
                const settings = await Settings.findFirst({ where: { companyId: req.user.companyId } });
                await googleDriveService.deleteFile(doc.fileId, settings);
            } catch (err) {
                console.warn('Failed to delete from Google Drive:', err.message);
            }
        }

        await Document.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        res.json({ message: 'File deleted successfully' });
    } catch (err) { next(err); }
};

exports.signFile = async (req, res, next) => {
    try {
        const Document = req.prisma.document;
        const userId = req.user.id;
        const doc = await Document.findUnique({ where: { id: req.params.id } });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        await AutomationService.trigger({
            eventType: 'document_signed',
            triggeredBy: userId,
            relatedItem: { itemId: doc.id, itemModel: 'Document' },
            description: `Document "${doc.name}" has been signed by ${req.user.name}.`,
            metadata: { fileName: doc.name, signer: req.user.name }
        }, req.prisma);

        res.json({ message: 'Document signed successfully', document: doc });
    } catch (err) { next(err); }
};

exports.attachExistingFile = async (req, res, next) => {
    try {
        const Document = req.prisma.document;
        const userId = req.user.id;
        const { documentId, relatedId, relatedModel } = req.body;

        if (!documentId || !relatedId || !relatedModel) {
            return res.status(400).json({ error: 'Missing required fields: documentId, relatedId, relatedModel' });
        }

        const sourceDoc = await Document.findUnique({ where: { id: documentId } });
        if (!sourceDoc) {
            return res.status(404).json({ error: 'Source document not found' });
        }

        // Create a new document entry linking to the same file
        const newDoc = await Document.create({ data: {
            name: sourceDoc.name,
            fileUrl: sourceDoc.fileUrl,
            fileId: sourceDoc.fileId,
            storageType: sourceDoc.storageType,
            fileType: sourceDoc.fileType,
            fileSize: sourceDoc.fileSize,
            folder: sourceDoc.folder,
            category: sourceDoc.category,
            uploadedById: userId,
            companyId: req.user.companyId,
            relatedId,
            relatedModel,
            description: sourceDoc.description,
            tags: sourceDoc.tags,
            isConfidential: sourceDoc.isConfidential,
            isLinkOnly: sourceDoc.isLinkOnly
        } });

        // Trigger Automation for file link
        await AutomationService.trigger({
            eventType: 'document_uploaded',
            triggeredBy: userId,
            relatedItem: { itemId: newDoc.id, itemModel: 'Document' },
            description: `Document "${newDoc.name}" was attached to ${relatedModel}`,
            metadata: { fileName: newDoc.name, folder: newDoc.folder, fileUrl: newDoc.fileUrl }
        }, req.prisma);

        res.status(201).json({ success: true, document: newDoc });
    } catch (err) { next(err); }
};

const { getPresignedUploadUrl } = require('../services/r2');
exports.getPresignedUrl = async (req, res, next) => {
    try {
        const { key, contentType } = req.query;
        if (!key || !contentType) {
            return res.status(400).json({ error: 'Missing key or contentType' });
        }
        const url = await getPresignedUploadUrl(key, contentType);
        const publicUrl = `${process.env.REELS_CDN_URL || 'https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev'}/${key}`;
        res.json({ url, key, publicUrl });
    } catch (err) {
        next(err);
    }
};

