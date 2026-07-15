'use strict';

const { getTenantPrisma } = require('@workspace/db');

/**
 * Get all events for a company
 */
exports.getCompanyEvents = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const tenantDb = getTenantPrisma(companyId);
        
        const events = await tenantDb.event.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

/**
 * Get a specific event with its registrations
 */
exports.getCompanyEvent = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;
        const tenantDb = getTenantPrisma(companyId);
        
        const event = await tenantDb.event.findFirst({
            where: { id, companyId },
            include: {
                registrations: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new event
 */
exports.createEvent = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const tenantDb = getTenantPrisma(companyId);
        const eventData = req.body;
        
        const event = await tenantDb.event.create({
            data: {
                ...eventData,
                companyId
            }
        });
        
        res.status(201).json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
};

/**
 * Update an event
 */
exports.updateEvent = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;
        const tenantDb = getTenantPrisma(companyId);
        const eventData = req.body;
        
        const event = await tenantDb.event.findFirst({
            where: { id, companyId }
        });
        
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        const updatedEvent = await tenantDb.event.update({
            where: { id },
            data: eventData
        });
        
        res.json({ success: true, data: updatedEvent });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete an event
 */
exports.deleteEvent = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;
        const tenantDb = getTenantPrisma(companyId);
        
        const event = await tenantDb.event.findFirst({
            where: { id, companyId }
        });
        
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        await tenantDb.event.delete({
            where: { id }
        });
        
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * Upload event banner (bypasses tenant storage check, uses R2)
 */
exports.uploadBanner = async (req, res, next) => {
    try {
        if (!req.storageResult || !req.storageResult.fileUrl) {
            return res.status(400).json({ success: false, message: 'File upload failed' });
        }
        
        // Return in a format that OrganizeEventModal expects or standard format
        res.json({ success: true, document: { fileUrl: req.storageResult.fileUrl } });
    } catch (err) {
        next(err);
    }
};
