'use strict';

/**
 * Company Services Controller
 */

exports.createService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { name, description, startingPrice, imageUrl, detailedDescription } = req.body;

        const newService = await req.prisma.companyService.create({
            data: {
                companyId,
                name,
                description,
                startingPrice,
                imageUrl,
                detailedDescription
            }
        });

        res.status(201).json({ success: true, data: newService });
    } catch (error) {
        console.error('Create company service error:', error);
        res.status(500).json({ success: false, message: 'Server error creating service.', error: error.message });
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

        // Verify ownership
        const existingService = await req.prisma.companyService.findFirst({
            where: { id, companyId }
        });

        if (!existingService) {
            return res.status(404).json({ success: false, message: 'Service not found or unauthorized.' });
        }

        const updatedService = await req.prisma.companyService.update({
            where: { id },
            data: {
                name,
                description,
                startingPrice,
                imageUrl,
                detailedDescription
            }
        });

        res.json({ success: true, data: updatedService });
    } catch (error) {
        console.error('Update company service error:', error);
        res.status(500).json({ success: false, message: 'Server error updating service.', error: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const existingService = await req.prisma.companyService.findFirst({
            where: { id, companyId }
        });

        if (!existingService) {
            return res.status(404).json({ success: false, message: 'Service not found or unauthorized.' });
        }

        await req.prisma.companyService.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Delete company service error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting service.', error: error.message });
    }
};

exports.getPublicServiceDetails = async (req, res) => {
    try {
        const { id, serviceId } = req.params;

        const service = await req.prisma.companyService.findFirst({
            where: { id: serviceId, companyId: id }
        });

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        res.json({ success: true, data: service });
    } catch (error) {
        console.error('Get public service details error:', error);
        res.status(500).json({ success: false, message: 'Server error getting service details.', error: error.message });
    }
};

exports.createServiceRequest = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        const { requirements, requesterEmail, requesterName } = req.body;

        if (!requirements || !requesterEmail) {
            return res.status(400).json({ success: false, message: 'Requirements and email are required.' });
        }

        const service = await req.prisma.companyService.findFirst({
            where: { id: serviceId, companyId: id }
        });

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        const newRequest = await req.prisma.serviceRequest.create({
            data: {
                serviceId,
                companyId: id,
                requesterEmail,
                requesterName: requesterName || 'Unknown User',
                requirements
            }
        });

        res.status(201).json({ success: true, data: newRequest });
    } catch (error) {
        console.error('Create service request error:', error);
        res.status(500).json({ success: false, message: 'Server error creating request.', error: error.message });
    }
};

exports.getServiceRequests = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const requests = await req.prisma.serviceRequest.findMany({
            where: { companyId },
            include: {
                service: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Get service requests error:', error);
        res.status(500).json({ success: false, message: 'Server error getting requests.', error: error.message });
    }
};
