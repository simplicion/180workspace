---
sidebar_position: 2
---

# Google Workspace Integration

The 180workspace Platform integrates with Google Workspace APIs to provide seamless document management and data synchronization for companys.

## Implementation Files
- `src/services/google-drive.service.js`
- `src/services/google-sheets.service.js`

## OAuth Flow
To use Google services, a user must authenticate via OAuth 2.0.
1. The user clicks "Connect Google Workspace".
2. They are redirected to Google's consent screen.
3. Upon approval, Google returns an authorization code to our callback route.
4. We exchange the code for `access_token` and `refresh_token`, storing them securely against the `User` or `CompanyConfig` record.

## Google Drive (`google-drive.service.js`)
This service allows users to:
- Export platform reports directly to a specific Google Drive folder.
- Attach existing Google Drive documents to Tasks or Projects within the 180workspace Dashboard without downloading/uploading them.

## Google Sheets (`google-sheets.service.js`)
This service enables dynamic data export and sync:
- Exporting CRM lead lists or expense reports to a connected Google Sheet.
- Future capabilities may include reading data from a designated Sheet to update records inside 180workspace.
