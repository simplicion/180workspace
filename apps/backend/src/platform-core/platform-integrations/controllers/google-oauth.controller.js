'use strict';

const { google } = require('googleapis');
const { prisma } = require('@workspace/db');

const getOauth2Client = () => {
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
            data: { metadata: JSON.stringify(metadata) }
        });

        res.json({ success: true });
    } catch (error) {
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
        
        const metadata = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : company.metadata;
        const tokens = metadata.googleDriveTokens;

        if (!tokens) {
            return res.status(400).json({ error: 'Google Drive not connected' });
        }

        const oauth2Client = getOauth2Client();
        oauth2Client.setCredentials(tokens);

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        res.json({ folders: response.data.files });
    } catch (error) {
        console.error('[GoogleOAuth] Get folders error:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
};

exports.createFolder = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Folder name is required' });

        const settings = await prisma.settings.findFirst();
        const companyId = req.user?.companyId || settings.companyId;
        const company = await prisma.company.findUnique({ where: { id: companyId } });

        let tokens = null;
        if (company && company.metadata) {
            const metadata = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : company.metadata;
            tokens = metadata.googleDriveTokens;
        }

        if (!tokens) {
            return res.status(401).json({ error: 'Not authenticated with Google' });
        }

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
        
        if (company && company.metadata) {
            let metadata = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : company.metadata;
            delete metadata.googleDriveTokens;
            
            await prisma.company.update({
                where: { id: companyId },
                data: { metadata: JSON.stringify(metadata) }
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('[GoogleOAuth] Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
};
