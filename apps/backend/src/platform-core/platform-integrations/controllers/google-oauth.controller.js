'use strict';

const { google } = require('googleapis');
const { prisma } = require('@workspace/db');

const getOauth2Client = () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('MISSING_CREDENTIALS');
    }
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/dashboard/settings/google-integrations'
    );
};

exports.getAuthUrl = (req, res) => {
    try {
        const { service } = req.query;
        
        let requestedScopes = [];
        const scopeMapping = {
            'drive': 'https://www.googleapis.com/auth/drive',
            'docs': 'https://www.googleapis.com/auth/documents',
            'sheets': 'https://www.googleapis.com/auth/spreadsheets',
            'calendar': 'https://www.googleapis.com/auth/calendar',
            'contacts': 'https://www.googleapis.com/auth/contacts'
        };

        if (service) {
            const services = service.split(',');
            services.forEach(s => {
                if (scopeMapping[s.trim()]) {
                    requestedScopes.push(scopeMapping[s.trim()]);
                }
            });
        }
        
        // Fallback to drive if no valid service is provided
        if (requestedScopes.length === 0) {
            requestedScopes.push('https://www.googleapis.com/auth/drive');
        }

        const oauth2Client = getOauth2Client();
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: requestedScopes,
            include_granted_scopes: true,
            prompt: 'consent' // Force to get refresh token
        });
        res.json({ url });
    } catch (error) {
        if (error.message === 'MISSING_CREDENTIALS') {
            console.error('[GoogleOAuth] Missing Google OAuth credentials in .env');
            return res.status(500).json({ error: 'Google integrations are not fully configured. Missing Client Secret.' });
        }
        console.error('[GoogleOAuth] Error generating URL:', error);
        res.status(500).json({ error: 'Failed to generate Auth URL' });
    }
};

exports.handleCallback = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is missing' });
        }

        const oauth2Client = getOauth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        // Fetch company settings
        const settings = await prisma.settings.findFirst();
        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }

        // We assume metadata contains the google auth info
        const companyId = req.user?.companyId || settings.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        
        let metadata = {};
        if (company && company.metadata) {
            metadata = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : company.metadata;
        }

        // Store tokens
        metadata.googleDriveTokens = tokens;
        
        // Save back to DB
        await prisma.company.update({
            where: { id: companyId },
            data: { metadata }
        });

        res.json({ success: true });
    } catch (error) {
        if (error.message === 'MISSING_CREDENTIALS') {
            console.error('[GoogleOAuth] Missing Google OAuth credentials in .env');
            return res.status(500).json({ error: 'Google integrations are not fully configured. Missing Client Secret.' });
        }
        console.error('[GoogleOAuth] Callback error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
};

exports.getFolders = async (req, res) => {
    try {
        // Fetch company settings and metadata
        const settings = await prisma.settings.findFirst();
        const companyId = req.user?.companyId || settings.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        
        if (!company || !company.metadata) {
            return res.status(400).json({ error: 'Google Drive not connected' });
        }
        
        let metadata = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        const tokens = metadata.googleDriveTokens;

        if (!tokens) {
            return res.status(400).json({ error: 'Google Drive not connected' });
        }

        const oauth2Client = getOauth2Client();
        oauth2Client.setCredentials(tokens);

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        const folderId = req.query.folderId;
        const query = folderId 
            ? `mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents and trashed=false`
            : `mimeType='application/vnd.google-apps.folder' and trashed=false`;
            
        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            orderBy: 'name',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            corpora: 'allDrives'
        });

        res.json({ folders: response.data.files });
    } catch (error) {
        console.error('[GoogleOAuth] Get folders error:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
};

exports.getFiles = async (req, res) => {
    try {
        const settings = await prisma.settings.findFirst();
        const companyId = req.user?.companyId || settings.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        
        let metadata = company?.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        const tokens = metadata.googleDriveTokens;

        if (!tokens) {
            return res.status(400).json({ error: 'Google Drive not connected' });
        }

        const oauth2Client = getOauth2Client();
        oauth2Client.setCredentials(tokens);

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        const folderId = req.query.folderId || 'root';
        const query = `'${folderId}' in parents and trashed=false`;
        
        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink)',
            orderBy: 'folder, name',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            corpora: 'allDrives'
        });

        res.json({ files: response.data.files });
    } catch (error) {
        console.error('[GoogleOAuth] Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
};

exports.createFolder = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Folder name is required' });

        const settings = await prisma.settings.findFirst();
        const companyId = req.user?.companyId || settings.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });

        let metadata = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        const tokens = metadata.googleDriveTokens;

        if (!tokens) {
            return res.status(400).json({ error: 'Google Drive not connected' });
        }

        const oauth2Client = getOauth2Client();
        oauth2Client.setCredentials(tokens);
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const fileMetadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder'
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            fields: 'id, name'
        });

        res.json({ folder: response.data });
    } catch (error) {
        console.error('[GoogleOAuth] Create folder error:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
};

exports.disconnect = async (req, res) => {
    try {
        const settings = await prisma.settings.findFirst();
        const companyId = req.user?.companyId || settings.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        
        let metadata = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        
        delete metadata.googleDriveTokens;
        
        await prisma.company.update({
            where: { id: companyId },
            data: { metadata }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('[GoogleOAuth] Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
};
