'use strict';

exports.createProduct = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, link, logoUrl } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Product name is required.' });
        }

        const product = await req.prisma.companyProduct.create({
            data: {
                companyId,
                name,
                description,
                link,
                logoUrl
            }
        });

        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error('Create company product error:', error);
        res.status(500).json({ success: false, message: 'Server error creating product.', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.id;
        
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, link, logoUrl } = req.body;

        const existing = await req.prisma.companyProduct.findFirst({
            where: { id: productId, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const product = await req.prisma.companyProduct.update({
            where: { id: productId },
            data: {
                name: name !== undefined ? name : existing.name,
                description: description !== undefined ? description : existing.description,
                link: link !== undefined ? link : existing.link,
                logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
            }
        });

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Update company product error:', error);
        res.status(500).json({ success: false, message: 'Server error updating product.', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const existing = await req.prisma.companyProduct.findFirst({
            where: { id: productId, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        await req.prisma.companyProduct.delete({
            where: { id: productId }
        });

        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Delete company product error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting product.', error: error.message });
    }
};
