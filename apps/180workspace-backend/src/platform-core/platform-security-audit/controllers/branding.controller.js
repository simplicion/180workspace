'use strict';

/**
 * Branding Controller
 * Handles platform and company branding assets (logos).
 */
exports.uploadLogo = async (req, res, next) => {
    try {
        if (!req.storageResult) {
            return res.status(400).json({ error: 'Logo upload failed' });
        }

        // Just return the URL â€” the frontend will then save it to settings/company-config
        res.status(200).json({
            url: req.storageResult.fileUrl,
            message: 'Logo uploaded successfully'
        });
    } catch (err) {
        next(err);
    }
};
