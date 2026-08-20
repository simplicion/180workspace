const { CompanyMediaService } = require('@workspace/company');

exports.addMedia = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { imageUrl } = req.body;
        const media = await CompanyMediaService.addMedia(companyId, imageUrl);
        res.status(201).json({ success: true, data: media });
    } catch (error) {
        console.error('Add company media error:', error);
        if (error.message === 'Image URL is required.') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error adding media.' });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const mediaId = req.params.id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyMediaService.deleteMedia(companyId, mediaId);
        res.json({ success: true, message: 'Media deleted successfully.' });
    } catch (error) {
        console.error('Delete company media error:', error);
        if (error.message === 'Media not found.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error deleting media.' });
    }
};
