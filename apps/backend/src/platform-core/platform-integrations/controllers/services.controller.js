'use strict';

/**
 * Company Services & Leads Controller
 */

const { sendEmail } = require('../../../app-registry/productivity-tools-app/emails/email.service');

// SERVICES CRUD
exports.addService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'User does not belong to a company.' });

        const { name, description, startingPrice, icon } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Service name is required.' });

        const service = await req.prisma.companyService.create({
            data: {
                companyId,
                name,
                description,
                startingPrice,
                icon
            }
        });

        res.json({ success: true, data: service });
    } catch (error) {
        console.error('Add service error:', error);
        res.status(500).json({ success: false, message: 'Server error adding service.', error: error.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const serviceId = req.params.id;

        const { name, description, startingPrice, icon } = req.body;

        const service = await req.prisma.companyService.update({
            where: { id: serviceId, companyId },
            data: { name, description, startingPrice, icon }
        });

        res.json({ success: true, data: service });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ success: false, message: 'Server error updating service.' });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const serviceId = req.params.id;

        await req.prisma.companyService.delete({
            where: { id: serviceId, companyId }
        });

        res.json({ success: true, message: 'Service deleted.' });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting service.' });
    }
};

exports.getServices = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;
        
        const services = await req.prisma.companyService.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: services });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving services.' });
    }
};

// LEAD GENERATION (REQUEST SERVICE)
exports.submitServiceRequest = async (req, res) => {
    try {
        const { serviceId, companyId, requesterName, requesterEmail, requesterCompanyName, companySize, requirements, budgetRange, timeline } = req.body;

        if (!serviceId || !companyId || !requesterName || !requesterEmail || !requirements) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const request = await req.prisma.serviceRequest.create({
            data: {
                serviceId,
                companyId,
                requesterName,
                requesterEmail,
                requesterCompanyName,
                companySize,
                requirements,
                budgetRange,
                timeline
            }
        });

        // Try to fetch company admin email to send notification
        const company = await req.prisma.company.findUnique({
            where: { id: companyId },
            select: { adminEmail: true, name: true }
        });
        
        const service = await req.prisma.companyService.findUnique({
            where: { id: serviceId }
        });

        if (company && company.adminEmail) {
            try {
                await sendEmail(company.adminEmail, 'New Service Request - PitchIn', `
                    <h3>New Service Request Received!</h3>
                    <p>You have a new request for the service: <strong>${service ? service.name : 'Unknown'}</strong>.</p>
                    <p><strong>From:</strong> ${requesterName} (${requesterEmail})</p>
                    <p><strong>Company:</strong> ${requesterCompanyName || 'N/A'}</p>
                    <p><strong>Requirements:</strong> ${requirements}</p>
                    <p><strong>Budget:</strong> ${budgetRange || 'N/A'} | <strong>Timeline:</strong> ${timeline || 'N/A'}</p>
                    <br/>
                    <p>Log in to your 180workspace Dashboard to manage this request.</p>
                `);
            } catch (emailError) {
                console.error("Failed to send lead email notification", emailError);
                // We don't fail the request if the email fails
            }
        }

        res.json({ success: true, data: request, message: 'Request submitted successfully.' });
    } catch (error) {
        console.error('Submit request error:', error);
        res.status(500).json({ success: false, message: 'Server error submitting request.', error: error.message });
    }
};

exports.getServiceRequests = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const requests = await req.prisma.serviceRequest.findMany({
            where: { companyId },
            include: {
                service: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Get service requests error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving requests.' });
    }
};

exports.updateServiceRequestStatus = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const requestId = req.params.id;
        const { status } = req.body;

        const request = await req.prisma.serviceRequest.update({
            where: { id: requestId, companyId },
            data: { status }
        });

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('Update request status error:', error);
        res.status(500).json({ success: false, message: 'Server error updating status.' });
    }
};
