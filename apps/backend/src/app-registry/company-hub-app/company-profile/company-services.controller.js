const { CompanyServicesService } = require('@workspace/company');

exports.createService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription } = req.body;
        const newService = await CompanyServicesService.createService(companyId, name, description, startingPrice, imageUrl, detailedDescription);
        res.status(201).json({ success: true, data: newService });
    } catch (error) {
        console.error('Create company service error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error creating service.' });
    }
};

exports.updateService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription } = req.body;
        const updatedService = await CompanyServicesService.updateService(companyId, id, name, description, startingPrice, imageUrl, detailedDescription);
        res.json({ success: true, data: updatedService });
    } catch (error) {
        console.error('Update company service error:', error);
        if (error.message === 'Service not found or unauthorized.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error updating service.' });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        await CompanyServicesService.deleteService(companyId, id);
        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Delete company service error:', error);
        if (error.message === 'Service not found or unauthorized.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error deleting service.' });
    }
};

exports.getPublicServiceDetails = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        const service = await CompanyServicesService.getPublicServiceDetails(id, serviceId);
        res.json({ success: true, data: service });
    } catch (error) {
        console.error('Get public service details error:', error);
        if (error.message === 'Service not found.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error getting service details.' });
    }
};

exports.createServiceRequest = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        const { requirements, requesterEmail, requesterName } = req.body;
        const newRequest = await CompanyServicesService.createServiceRequest(id, serviceId, requirements, requesterEmail, requesterName);
        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        console.error('Create service request error:', error);
        if (error.message === 'Requirements and email are required.') {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.message === 'Service not found.') {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error creating request.' });
    }
};

exports.getServiceRequests = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const requests = await CompanyServicesService.getServiceRequests(companyId);
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Get service requests error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error getting requests.' });
    }
};
