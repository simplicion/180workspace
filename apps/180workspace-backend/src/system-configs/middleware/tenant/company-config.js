'use strict';

module.exports = async (req, res, next) => {
    try {
        if (!req.prisma) return next();

        let config = await req.prisma.companyConfig.findFirst();
        
        if (!config) {
            // Create default if not found
            // Assuming required fields have defaults or are optional, else we provide minimum
            config = await req.prisma.companyConfig.create({ data: {} });
        }
        
        req.companyConfig = config;
        next();
    } catch (err) {
        console.error('Error fetching company config:', err);
        next(); // Proceed regardless to avoid blocking the system
    }
};
