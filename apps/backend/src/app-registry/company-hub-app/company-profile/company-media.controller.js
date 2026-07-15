'use strict';

exports.addMedia = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Image URL is required.' });
        }

        const media = await req.prisma.companyMedia.create({
            data: {
                companyId,
                imageUrl
            }
        });

        res.status(201).json({ success: true, data: media });
    } catch (error) {
        console.error('Add company media error:', error);
        res.status(500).json({ success: false, message: 'Server error adding media.', error: error.message });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const mediaId = req.params.id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const existing = await req.prisma.companyMedia.findFirst({
            where: { id: mediaId, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Media not found.' });
        }

        await req.prisma.companyMedia.delete({
            where: { id: mediaId }
        });

        res.json({ success: true, message: 'Media deleted successfully.' });
    } catch (error) {
        console.error('Delete company media error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting media.', error: error.message });
    }
};
