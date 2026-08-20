const { CompanyProductsService } = require('@workspace/company');

exports.createProduct = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, link, logoUrl } = req.body;
        const product = await CompanyProductsService.createProduct(companyId, name, description, link, logoUrl);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error('Create company product error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error creating product.' });
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
        const product = await CompanyProductsService.updateProduct(companyId, productId, name, description, link, logoUrl);
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Update company product error:', error);
        if (error.message === 'Product not found.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error updating product.' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const productId = req.params.id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyProductsService.deleteProduct(companyId, productId);
        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Delete company product error:', error);
        if (error.message === 'Product not found.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error deleting product.' });
    }
};
