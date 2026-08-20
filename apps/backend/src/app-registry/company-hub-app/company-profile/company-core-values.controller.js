const { CompanyCoreValuesService } = require('@workspace/company');

exports.addCoreValue = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { title, description, iconUrl } = req.body;
        
        const newCoreValue = await CompanyCoreValuesService.addCoreValue(userId, title, description, iconUrl);
        res.status(201).json({ success: true, data: newCoreValue });
    } catch (error) {
        console.error('Error adding core value:', error);
        if (['Title and description are required', 'You can add a maximum of 10 core values'].includes(error.message)) {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.message === 'Company not found') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.deleteCoreValue = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const coreValueId = req.params.id;
        
        await CompanyCoreValuesService.deleteCoreValue(userId, coreValueId);
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error('Error deleting core value:', error);
        if (['Company not found', 'Core value not found or unauthorized'].includes(error.message)) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
