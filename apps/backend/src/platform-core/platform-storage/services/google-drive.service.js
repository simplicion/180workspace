'use strict';

const { google } = require('googleapis');
const { Readable } = require('stream');

/**
 * Google Drive Service
 * Refactored to be company-aware. Methods now accept settings objects.
 */
class GoogleDriveService {
    /**
     * Internal helper to get a Drive client for a specific company
     * @param {Object} settings - Company-specific settings
     */
    #getDriveClient(settings) {
        // If metadata was passed directly or embedded inside settings
        const metadata = settings.metadata || {};
        
        // Priority 1: OAuth Tokens
        if (metadata.googleDriveTokens) {
            try {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/dashboard/settings/storage'
                );
                oauth2Client.setCredentials(metadata.googleDriveTokens);
                return google.drive({ version: 'v3', auth: oauth2Client });
            } catch (err) {
                console.error('[GoogleDriveService] Failed to init OAuth client:', err.message);
                throw new Error('Invalid Google Drive OAuth credentials');
            }
        }

        // Priority 2: Service Account
        if (!settings || !settings.googleDriveServiceAccount) {
            throw new Error('Google Drive credentials not configured in company settings');
        }

        try {
            const credentials = JSON.parse(settings.googleDriveServiceAccount);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });

            return google.drive({ version: 'v3', auth });
        } catch (err) {
            console.error('[GoogleDriveService] Failed to parse Service Account credentials:', err.message);
            throw new Error('Invalid Google Drive credentials format');
        }
    }

    /**
     * Upload a file buffer to Google Drive
     * @param {Buffer} buffer 
     * @param {Object} fileMeta - { name, mimeType }
     * @param {Object} settings - Company-specific settings
     * @returns {Promise<Object>} - { fileId, webContentLink, webViewLink }
     */
    async uploadFile(buffer, fileMeta, settings) {
        const drive = this.#getDriveClient(settings);
        const folderId = settings.googleDriveFolderId;

        const fileMetadata = {
            name: fileMeta.name,
            parents: folderId ? [folderId] : [],
        };

        const media = {
            mimeType: fileMeta.mimeType,
            body: Readable.from(buffer),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webContentLink, webViewLink',
        });

        // Make file readable to anyone with the link
        try {
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (err) {
            console.warn('[GoogleDriveService] Failed to set public permissions:', err.message);
        }

        return response.data;
    }

    /**
     * Delete a file from Google Drive
     * @param {string} fileId 
     * @param {Object} settings - Company-specific settings
     */
    async deleteFile(fileId, settings) {
        const drive = this.#getDriveClient(settings);
        await drive.files.delete({ fileId });
    }

    /**
     * Get file content from Google Drive
     * @param {string} fileId 
     * @param {Object} settings - Company-specific settings
     * @returns {Promise<string>} - Content as string
     */
    async getFileContent(fileId, settings) {
        const drive = this.#getDriveClient(settings);
        const response = await drive.files.get({
            fileId: fileId,
            alt: 'media',
        }, { responseType: 'arraybuffer' });

        return Buffer.from(response.data).toString('utf-8');
    }

    /**
     * Test connection to Google Drive
     * @param {Object} settings - Company-specific settings
     * @returns {Promise<boolean>}
     */
    async testConnection(settings) {
        try {
            const drive = this.#getDriveClient(settings);
            await drive.files.list({ pageSize: 1 });
            return true;
        } catch (err) {
            console.error('[GoogleDriveService] Connection test failed:', err.message);
            throw err;
        }
    }
}

module.exports = new GoogleDriveService();
