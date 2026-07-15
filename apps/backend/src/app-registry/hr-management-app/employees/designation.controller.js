const { prisma } = require('@workspace/db');

/**
 * Get all designations available for the current company
 * Includes global designations (companyId = null) and custom designations (companyId = req.user.companyId)
 */
exports.getDesignations = async (req, res) => {
    try {
        const { search } = req.query;
        const companyId = req.user.companyId;

        if (!companyId) {
            return res.status(400).json({ error: 'User does not belong to a company' });
        }

        const whereClause = {
            OR: [
                { companyId: null }, // global template designations
                { companyId: companyId } // company specific custom designations
            ]
        };

        if (search) {
            whereClause.name = {
                contains: search,
                mode: 'insensitive'
            };
        }

        const designations = await prisma.designation.findMany({
            where: whereClause,
            orderBy: [
                { usageCount: 'desc' },
                { name: 'asc' }
            ]
        });

        res.json({
            success: true,
            data: designations
        });
    } catch (error) {
        console.error('Error fetching designations:', error);
        res.status(500).json({ error: 'Server error fetching designations' });
    }
};

/**
 * Create a new custom designation for the current company
 */
exports.createDesignation = async (req, res) => {
    try {
        const { name, category = 'general' } = req.body;
        const companyId = req.user.companyId;

        if (!companyId) {
            return res.status(400).json({ error: 'User does not belong to a company' });
        }

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Designation name is required' });
        }

        // Check if designation already exists for this company
        const existing = await prisma.designation.findFirst({
            where: {
                name: {
                    equals: name.trim(),
                    mode: 'insensitive'
                },
                OR: [
                    { companyId: null },
                    { companyId: companyId }
                ]
            }
        });

        if (existing) {
            return res.status(400).json({ 
                error: 'A designation with this name already exists',
                data: existing
            });
        }

        const designation = await prisma.designation.create({
            data: {
                name: name.trim(),
                category,
                isCustom: true,
                companyId
            }
        });

        res.status(201).json({
            success: true,
            data: designation
        });
    } catch (error) {
        console.error('Error creating designation:', error);
        res.status(500).json({ error: 'Server error creating designation' });
    }
};
