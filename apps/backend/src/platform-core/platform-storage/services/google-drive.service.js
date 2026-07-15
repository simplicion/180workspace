'use strict';

const { google } = require('googleapis');
const { Readable } = require('stream');

/**
 * Google Drive Service
 * Refactored to be tenant-aware. Methods now accept settings objects.
 */
class GoogleDriveService {
    /**
     * Internal helper to get a Drive client for a specific tenant
     * @param {Object} settings - Tenant-specific settings
     */
    #getDriveClient(settings) {
        if (!settings || !settings.googleDriveServiceAccount) {
            throw new Error('Google Drive service account credentials not configured in tenant settings');
        }

        try {
            const credentials = JSON.parse(settings.googleDriveServiceAccount);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });

            return google.drive({ version: 'v3', auth });
        } catch (err) {
            console.error('[GoogleDriveService] Failed to parse credentials:', err.message);
            throw new Error('Invalid Google Drive credentials format');
        }
    }

    /**
     * Upload a file buffer to Google Drive
     * @param {Buffer} buffer 
     * @param {Object} fileMeta - { name, mimeType }
     * @param {Object} settings - Tenant-specific settings
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
     * @param {Object} settings - Tenant-specific settings
     */
    async deleteFile(fileId, settings) {
        const drive = this.#getDriveClient(settings);
        await drive.files.delete({ fileId });
    }

    /**
     * Get file content from Google Drive
     * @param {string} fileId 
     * @param {Object} settings - Tenant-specific settings
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
     * @param {Object} settings - Tenant-specific settings
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
