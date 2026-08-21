import { google } from 'googleapis';

export class GoogleSheetsService {
    /**
     * Initializes a Google Sheets instance for a specific company
     * @param {Object} settings - Company-specific settings object
     * @returns {Object} { sheets, spreadsheetId }
     */
    private async getClient(settings: any) {
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
        } catch (err: any) {
            console.error('[Google Sheets Service] Initialization failed:', err.message);
            throw err;
        }
    }

    /**
     * Append meeting summary to the spreadsheet
     */
    async appendMeetingSummary(settings: any, data: any) {
        const { sheets, spreadsheetId } = await this.getClient(settings);
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
                requestBody: { values },
            });
        } catch (err: any) {
            console.error('[Google Sheets Service] Append failed:', err.message);
            throw err;
        }
    }

    /**
     * Get meeting summary from the spreadsheet by Room ID
     */
    async getMeetingSummaryByRoomId(settings: any, roomId: string) {
        const { sheets, spreadsheetId } = await this.getClient(settings);
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
        } catch (err: any) {
            console.error('[Google Sheets Service] Get summary failed:', err.message);
            throw err;
        }
    }
}
