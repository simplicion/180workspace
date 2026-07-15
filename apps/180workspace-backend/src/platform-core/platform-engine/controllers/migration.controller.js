'use strict';

exports.startMigration = async (req, res) => {
    res.json({
        success: true,
        message: 'Database migration is not required as the platform has been fully migrated to a unified PostgreSQL instance.'
    });
};

exports.getMigrationStatus = async (req, res) => {
    res.json({
        status: 'completed',
        progress: 100,
        message: 'Platform is running on the unified PostgreSQL database.'
    });
};
