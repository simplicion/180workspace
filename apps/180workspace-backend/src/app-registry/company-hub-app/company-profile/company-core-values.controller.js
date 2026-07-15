'use strict';


/**
 * @desc    Add a core value to company
 * @route   POST /api/company-profile/private/core-values
 * @access  Private (Company Admin)
 */
exports.addCoreValue = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Find company associated with the user
        const company = await req.prisma.company.findFirst({
            where: {
                users: {
                    some: {
                        id: userId
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const { title, description, iconUrl } = req.body;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
        }

        // Check if company has reached the limit of 10 core values
        const currentCoreValues = await req.prisma.companyCoreValue.count({
            where: { companyId: company.id }
        });

        if (currentCoreValues >= 10) {
            return res.status(400).json({ success: false, message: 'You can add a maximum of 10 core values' });
        }

        const newCoreValue = await req.prisma.companyCoreValue.create({
            data: {
                companyId: company.id,
                title,
                description,
                iconUrl: iconUrl || null
            }
        });

        res.status(201).json({
            success: true,
            data: newCoreValue
        });

    } catch (error) {
        console.error('Error adding core value:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Delete a core value
 * @route   DELETE /api/company-profile/private/core-values/:id
 * @access  Private (Company Admin)
 */
exports.deleteCoreValue = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const coreValueId = req.params.id;
        
        // Find company associated with the user
        const company = await req.prisma.company.findFirst({
            where: {
                users: {
                    some: {
                        id: userId
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const coreValue = await req.prisma.companyCoreValue.findFirst({
            where: {
                id: coreValueId,
                companyId: company.id
            }
        });

        if (!coreValue) {
            return res.status(404).json({ success: false, message: 'Core value not found or unauthorized' });
        }

        await req.prisma.companyCoreValue.delete({
            where: {
                id: coreValueId
            }
        });

        res.status(200).json({
            success: true,
            data: {}
        });

    } catch (error) {
        console.error('Error deleting core value:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
