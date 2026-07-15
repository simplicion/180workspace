'use strict';

const { google } = require('googleapis');

class GoogleSheetsService {
    /**
     * Initializes a Google Sheets instance for a specific tenant
     * @param {Object} settings - Tenant-specific settings object
     * @returns {Object} { sheets, spreadsheetId }
     */
    async #getClient(settings) {
        try {
            if (!settings || !settings.googleDriveServiceAccount) {
                throw new Error('Google Service Account credentials not configured for this company');
            }

            const credentials = JSON.parse(settings.googleDriveServiceAccount);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file'
                ],
            });

            const sheets = google.sheets({ version: 'v4', auth });
            return { sheets, spreadsheetId: settings.googleSheetsId };
        } catch (err) {
            console.error('[Google Sheets Service] Initialization failed:', err.message);
            throw err;
        }
    }

    /**
     * Append meeting summary to the spreadsheet
     * @param {Object} settings - Tenant settings
     * @param {Object} data - { roomId, title, date, participants, summary, actionItems, companyId }
     */
    async appendMeetingSummary(settings, data) {
        const { sheets, spreadsheetId } = await this.#getClient(settings);
        if (!spreadsheetId) throw new Error('Google Sheets ID not configured for this company');

        const values = [
            [
                data.roomId,
                data.title,
                data.date || new Date().toISOString(),
                (data.participants || []).join(', '),
                typeof data.summary === 'string' ? data.summary : JSON.stringify(data.summary),
                JSON.stringify(data.actionItems || []),
                data.companyId || 'N/A',
                new Date().toISOString() // Created At
            ]
        ];

        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sheet1!A:H', // A to H now
                valueInputOption: 'RAW',
                resource: { values },
            });
        } catch (err) {
            console.error('[Google Sheets Service] Append failed:', err.message);
            throw err;
        }
    }

    /**
     * Get meeting summary from the spreadsheet by Room ID
     * @param {Object} settings - Tenant settings
     * @param {string} roomId 
     */
    async getMeetingSummaryByRoomId(settings, roomId) {
        const { sheets, spreadsheetId } = await this.#getClient(settings);
        if (!spreadsheetId) return null;

        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Sheet1!A:H',
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) return null;

            // Find row by roomId (column A)
            const row = rows.find(r => r[0] === roomId);
            if (!row) return null;

            return {
                roomId: row[0],
                title: row[1],
                date: row[2],
                participants: row[3]?.split(', ') || [],
                summary: row[4]?.startsWith('{') ? JSON.parse(row[4]) : row[4],
                actionItems: row[5] ? JSON.parse(row[5]) : [],
                companyId: row[6],
                createdAt: row[7]
            };
        } catch (err) {
            console.error('[Google Sheets Service] Fetch failed:', err.message);
            return null;
        }
    }
    /**
     * Update documentation in the spreadsheet
     * @param {Object} settings - Tenant settings
     * @param {Array} documents - Array of document objects
     */
    async updateDocumentation(settings, documents) {
        const { sheets, spreadsheetId } = await this.#getClient(settings);
        if (!spreadsheetId) throw new Error('Google Sheets ID not configured');

        const values = [
            ['Title', 'Category', 'Content', 'Tags', 'Is Published', 'Last Updated'],
            ...documents.map(doc => [
                doc.title,
                doc.category,
                doc.content,
                (doc.tags || []).join(', '),
                doc.isPublished ? 'TRUE' : 'FALSE',
                doc.lastUpdated || new Date().toISOString()
            ])
        ];

        try {
            // Overwrite the 'Docs' sheet or create it if it doesn't exist
            // For simplicity, we assume 'Docs' sheet exists or we use Sheet1 if preferred
            const range = 'Docs!A:F';
            
            // First, clear the sheet
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range,
            });

            // Then, update with new values
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values },
            });
        } catch (err) {
            if (err.message.includes('Sheet not found')) {
                // If 'Docs' sheet doesn't exist, try to create it
                // This would require spreadsheets.batchUpdate but let's keep it simple for now and use Sheet1 or ask user to create it
                console.error('[Google Sheets Service] "Docs" sheet not found. Please create a sheet named "Docs" in your spreadsheet.');
            }
            console.error('[Google Sheets Service] Documentation update failed:', err.message);
            throw err;
        }
    }

    /**
     * Fetch all documentation from the spreadsheet
     * @param {Object} settings - Tenant settings
     */
    async getDocumentation(settings) {
        const { sheets, spreadsheetId } = await this.#getClient(settings);
        if (!spreadsheetId) return [];

        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Docs!A:F',
            });

            const rows = response.data.values;
            if (!rows || rows.length < 2) return [];

            // Skip header row
            return rows.slice(1).map(row => ({
                title: row[0],
                category: row[1],
                content: row[2],
                tags: row[3]?.split(', ') || [],
                isPublished: row[4] === 'TRUE',
                lastUpdated: row[5]
            }));
        } catch (err) {
            console.error('[Google Sheets Service] Documentation fetch failed:', err.message);
            return [];
        }
    }
}

module.exports = new GoogleSheetsService();
