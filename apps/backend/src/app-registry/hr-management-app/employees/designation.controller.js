const { prisma } = require('@workspace/db');

/**
 * Get all designations available for the current company
 * Includes global designations (companyId = null) and custom designations (companyId = req.user.companyId)
 */
const { EmployeeService } = require('@workspace/hr-management');

exports.getDesignations = async (req, res) => {
    try {
        const employeeService = new EmployeeService(prisma);
        const designations = await employeeService.getDesignations(req.user.companyId, req.query.search);
        res.json({
            success: true,
            data: designations
        });
    } catch (error) {
        if (error.message === 'User does not belong to a company') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error fetching designations:', error);
        res.status(500).json({ error: 'Server error fetching designations' });
    }
};

exports.createDesignation = async (req, res) => {
    try {
        const employeeService = new EmployeeService(prisma);
        const designation = await employeeService.createDesignation(req.user.companyId, req.body.name, req.body.category);
        res.status(201).json({
            success: true,
            data: designation
        });
    } catch (error) {
        if (error.message === 'User does not belong to a company' || error.message === 'Designation name is required' || error.message === 'A designation with this name already exists') {
            return res.status(400).json({ error: error.message, data: error.data });
        }
        console.error('Error creating designation:', error);
        res.status(500).json({ error: 'Server error creating designation' });
    }
};
